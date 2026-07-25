import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import * as schema from "./schema/index.js";

const { Pool } = pg;

export let pool: pg.Pool | null = null;
export let db: any;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await initTablesPostgres(pool);
  db = drizzleNodePg(pool, { schema });
} else {
  console.log(
    "ℹ️ DATABASE_URL not set — starting WASM PostgreSQL engine (PGlite)...",
  );
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");

  // Use a persistent directory so data survives server restarts
  // Stored at project root / .pglite-data/
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const dataDir = join(__dirname, "..", "..", "..", "..", ".pglite-data");

  const pgliteClient = new PGlite(dataDir);
  db = drizzlePglite({ client: pgliteClient, schema });

  // Initialize all 15 tables automatically in PGlite
  await initTablesPGlite(pgliteClient);
}

function getBootstrapDDL(): string {
  return `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      weekly_goal INTEGER NOT NULL DEFAULT 10,
      theme TEXT NOT NULL DEFAULT 'dark',
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS platforms (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS problems (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      platform TEXT NOT NULL,
      topics TEXT[] NOT NULL DEFAULT '{}',
      company_tags TEXT[] NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'Unsolved',
      favorite BOOLEAN NOT NULL DEFAULT FALSE,
      bookmark BOOLEAN NOT NULL DEFAULT FALSE,
      notes TEXT NOT NULL DEFAULT '',
      date_added DATE NOT NULL,
      solution_link TEXT NOT NULL DEFAULT '',
      solved_date DATE,
      last_revised_at TIMESTAMP WITH TIME ZONE,
      revision_count INTEGER NOT NULL DEFAULT 0,
      attempts INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS problem_topics (
      id SERIAL PRIMARY KEY,
      problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      topic_id INTEGER NOT NULL REFERENCES topics(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS revision_queue (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      next_review_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      interval INTEGER NOT NULL DEFAULT 1,
      ease_factor REAL NOT NULL DEFAULT 2.5,
      repetitions INTEGER NOT NULL DEFAULT 0,
      priority INTEGER NOT NULL DEFAULT 5,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT revision_queue_user_problem_idx UNIQUE (user_id, problem_id)
    );

    CREATE TABLE IF NOT EXISTS contests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'random',
      duration_minutes INTEGER NOT NULL DEFAULT 90,
      status TEXT NOT NULL DEFAULT 'active',
      score INTEGER NOT NULL DEFAULT 0,
      started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE,
      ends_at TIMESTAMP WITH TIME ZONE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contest_problems (
      id SERIAL PRIMARY KEY,
      contest_id INTEGER NOT NULL REFERENCES contests(id) ON DELETE CASCADE,
      problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      solved BOOLEAN NOT NULL DEFAULT FALSE,
      submitted_at TIMESTAMP WITH TIME ZONE,
      time_taken_seconds INTEGER
    );

    CREATE TABLE IF NOT EXISTS solve_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      solved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      time_taken_minutes INTEGER,
      difficulty TEXT NOT NULL,
      platform TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      content TEXT NOT NULL DEFAULT '',
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT notes_user_problem_idx UNIQUE (user_id, problem_id)
    );

    CREATE TABLE IF NOT EXISTS search_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      query TEXT NOT NULL,
      searched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      result_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS import_export_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      format TEXT NOT NULL,
      filename TEXT NOT NULL DEFAULT '',
      record_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'success',
      error_message TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS user_statistics (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
      total_solved INTEGER NOT NULL DEFAULT 0,
      total_attempted INTEGER NOT NULL DEFAULT 0,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_active_date DATE,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT favorites_user_problem_idx UNIQUE (user_id, problem_id)
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT bookmarks_user_problem_idx UNIQUE (user_id, problem_id)
    );
  `;
}

async function initTablesPostgres(client: pg.Pool) {
  await client.query(getBootstrapDDL());
  await ensureUsersTableCompatibilityPostgres(client);
}

async function ensureUsersTableCompatibilityPostgres(client: pg.Pool) {
  // Some older deployments used a different users table shape.
  // Keep startup resilient by upgrading critical auth columns in place.
  await client.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_goal INTEGER;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS theme TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE;
  `);

  const legacyPasswordCol = await client.query(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'password'
    LIMIT 1;
  `);

  if (legacyPasswordCol.rowCount && legacyPasswordCol.rowCount > 0) {
    await client.query(`
      UPDATE users
      SET password_hash = password
      WHERE (password_hash IS NULL OR password_hash = '')
        AND password IS NOT NULL;
    `);
  }

  await client.query(`
    UPDATE users SET weekly_goal = 10 WHERE weekly_goal IS NULL;
    UPDATE users SET theme = 'dark' WHERE theme IS NULL OR theme = '';
    UPDATE users SET created_at = NOW() WHERE created_at IS NULL;
    UPDATE users SET updated_at = NOW() WHERE updated_at IS NULL;
    UPDATE users
    SET password_hash = '$2b$12$A0rmS0qgE9Y9x3B3g7QIIuLqM5u3uol8mCtSYf3SNEA2P4eXg7uA2'
    WHERE password_hash IS NULL OR password_hash = '';
  `);

  await client.query(`
    ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
    ALTER TABLE users ALTER COLUMN weekly_goal SET DEFAULT 10;
    ALTER TABLE users ALTER COLUMN weekly_goal SET NOT NULL;
    ALTER TABLE users ALTER COLUMN theme SET DEFAULT 'dark';
    ALTER TABLE users ALTER COLUMN theme SET NOT NULL;
    ALTER TABLE users ALTER COLUMN created_at SET DEFAULT NOW();
    ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;
    ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT NOW();
    ALTER TABLE users ALTER COLUMN updated_at SET NOT NULL;
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_email_idx ON users(email);
  `);
}

async function initTablesPGlite(client: any) {
  await client.exec(getBootstrapDDL());
}

export * from "./schema/index.js";
