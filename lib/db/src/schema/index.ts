import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    weeklyGoal: integer("weekly_goal").notNull().default(10),
    theme: text("theme").notNull().default("dark"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_email_idx").on(t.email)],
);

// ─── Platforms ────────────────────────────────────────────────────────────────
export const platformsTable = pgTable("platforms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

// ─── Topics ───────────────────────────────────────────────────────────────────
export const topicsTable = pgTable("topics", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

// ─── Problems ─────────────────────────────────────────────────────────────────
export const problemsTable = pgTable(
  "problems",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    difficulty: text("difficulty").notNull(), // Easy | Medium | Hard
    platform: text("platform").notNull(),
    topics: text("topics").array().notNull().default([]),
    companyTags: text("company_tags").array().notNull().default([]),
    status: text("status").notNull().default("Unsolved"), // Solved | Unsolved
    favorite: boolean("favorite").notNull().default(false),
    bookmark: boolean("bookmark").notNull().default(false),
    notes: text("notes").notNull().default(""),
    dateAdded: date("date_added", { mode: "string" }).notNull(),
    solutionLink: text("solution_link").notNull().default(""),
    solvedDate: date("solved_date", { mode: "string" }),
    lastRevisedAt: timestamp("last_revised_at", { withTimezone: true }),
    revisionCount: integer("revision_count").notNull().default(0),
    attempts: integer("attempts").notNull().default(0),
  },
  (t) => [
    index("problems_user_idx").on(t.userId),
    index("problems_status_idx").on(t.status),
    index("problems_difficulty_idx").on(t.difficulty),
    index("problems_platform_idx").on(t.platform),
    index("problems_favorite_idx").on(t.favorite),
  ],
);

// ─── ProblemTopics (junction) ─────────────────────────────────────────────────
export const problemTopicsTable = pgTable(
  "problem_topics",
  {
    id: serial("id").primaryKey(),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problemsTable.id, { onDelete: "cascade" }),
    topicId: integer("topic_id")
      .notNull()
      .references(() => topicsTable.id, { onDelete: "cascade" }),
  },
  (t) => [index("problem_topics_problem_idx").on(t.problemId)],
);

// ─── RevisionQueue ────────────────────────────────────────────────────────────
// Implements SM-2 Spaced Repetition Algorithm fields
export const revisionQueueTable = pgTable(
  "revision_queue",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problemsTable.id, { onDelete: "cascade" }),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    interval: integer("interval").notNull().default(1), // days until next review
    easeFactor: real("ease_factor").notNull().default(2.5), // SM-2 ease factor
    repetitions: integer("repetitions").notNull().default(0), // successful reviews
    priority: integer("priority").notNull().default(5), // 1-10 manual priority
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("revision_queue_user_problem_idx").on(t.userId, t.problemId),
    index("revision_queue_next_review_idx").on(t.nextReviewAt),
  ],
);

// ─── Contests ─────────────────────────────────────────────────────────────────
export const contestsTable = pgTable(
  "contests",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").notNull().default("random"), // random | custom
    durationMinutes: integer("duration_minutes").notNull().default(90),
    status: text("status").notNull().default("active"), // active | completed | abandoned
    score: integer("score").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("contests_user_idx").on(t.userId),
    index("contests_status_idx").on(t.status),
  ],
);

// ─── ContestProblems (junction) ───────────────────────────────────────────────
export const contestProblemsTable = pgTable(
  "contest_problems",
  {
    id: serial("id").primaryKey(),
    contestId: integer("contest_id")
      .notNull()
      .references(() => contestsTable.id, { onDelete: "cascade" }),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problemsTable.id, { onDelete: "cascade" }),
    label: text("label").notNull(), // A, B, C, D, etc.
    solved: boolean("solved").notNull().default(false),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    timeTakenSeconds: integer("time_taken_seconds"),
  },
  (t) => [index("contest_problems_contest_idx").on(t.contestId)],
);

// ─── SolveHistory ─────────────────────────────────────────────────────────────
export const solveHistoryTable = pgTable(
  "solve_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problemsTable.id, { onDelete: "cascade" }),
    solvedAt: timestamp("solved_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    timeTakenMinutes: integer("time_taken_minutes"),
    difficulty: text("difficulty").notNull(),
    platform: text("platform").notNull(),
  },
  (t) => [
    index("solve_history_user_idx").on(t.userId),
    index("solve_history_solved_at_idx").on(t.solvedAt),
  ],
);

// ─── Notes ────────────────────────────────────────────────────────────────────
export const notesTable = pgTable(
  "notes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problemsTable.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("notes_user_problem_idx").on(t.userId, t.problemId),
  ],
);

// ─── SearchHistory ────────────────────────────────────────────────────────────
export const searchHistoryTable = pgTable(
  "search_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    query: text("query").notNull(),
    searchedAt: timestamp("searched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resultCount: integer("result_count").notNull().default(0),
  },
  (t) => [
    index("search_history_user_idx").on(t.userId),
    index("search_history_searched_at_idx").on(t.searchedAt),
  ],
);

// ─── ImportExportHistory ──────────────────────────────────────────────────────
export const importExportHistoryTable = pgTable(
  "import_export_history",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // import | export
    format: text("format").notNull(), // csv | json
    filename: text("filename").notNull().default(""),
    recordCount: integer("record_count").notNull().default(0),
    status: text("status").notNull().default("success"), // success | failed
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("import_export_history_user_idx").on(t.userId)],
);

// ─── UserStatistics ───────────────────────────────────────────────────────────
export const userStatisticsTable = pgTable(
  "user_statistics",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    totalSolved: integer("total_solved").notNull().default(0),
    totalAttempted: integer("total_attempted").notNull().default(0),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    lastActiveDate: date("last_active_date", { mode: "string" }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("user_statistics_user_idx").on(t.userId)],
);

// ─── Favorites ────────────────────────────────────────────────────────────────
// Denormalized for fast favorites listing (problems.favorite is source of truth)
export const favoritesTable = pgTable(
  "favorites",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problemsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("favorites_user_problem_idx").on(t.userId, t.problemId),
  ],
);

// ─── Bookmarks ────────────────────────────────────────────────────────────────
export const bookmarksTable = pgTable(
  "bookmarks",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    problemId: integer("problem_id")
      .notNull()
      .references(() => problemsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("bookmarks_user_problem_idx").on(t.userId, t.problemId),
  ],
);

// ─── Zod Schemas & Types ──────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;

export const insertProblemSchema = createInsertSchema(problemsTable).omit({
  id: true,
});
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type Problem = typeof problemsTable.$inferSelect;

export const insertContestSchema = createInsertSchema(contestsTable).omit({
  id: true,
  startedAt: true,
});
export type InsertContest = z.infer<typeof insertContestSchema>;
export type Contest = typeof contestsTable.$inferSelect;

export const insertRevisionQueueSchema = createInsertSchema(
  revisionQueueTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRevisionQueue = z.infer<typeof insertRevisionQueueSchema>;
export type RevisionQueueEntry = typeof revisionQueueTable.$inferSelect;

export const insertNoteSchema = createInsertSchema(notesTable).omit({
  id: true,
  updatedAt: true,
});
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notesTable.$inferSelect;

export const insertSolveHistorySchema = createInsertSchema(
  solveHistoryTable,
).omit({ id: true, solvedAt: true });
export type InsertSolveHistory = z.infer<typeof insertSolveHistorySchema>;
export type SolveHistory = typeof solveHistoryTable.$inferSelect;

export type UserStatistics = typeof userStatisticsTable.$inferSelect;
export type SearchHistoryEntry = typeof searchHistoryTable.$inferSelect;
export type ImportExportHistoryEntry =
  typeof importExportHistoryTable.$inferSelect;