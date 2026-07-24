import { drizzle as drizzleNodePg } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

export let pool: pg.Pool | null = null;
export let db: any;

if (process.env.DATABASE_URL) {
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNodePg(pool, { schema });
} else {
  console.log("ℹ️ DATABASE_URL not set — starting WASM PostgreSQL engine (PGlite)...");
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");

  const pgliteClient = new PGlite();
  db = drizzlePglite({ client: pgliteClient, schema });

  // Initialize all 15 tables automatically in PGlite
  await initTablesPGlite(pgliteClient);
}

async function initTablesPGlite(client: any) {
  const ddl = `
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
  await client.exec(ddl);
}

export * from "./schema/index.js";
