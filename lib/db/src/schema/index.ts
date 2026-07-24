import { boolean, date, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const problemsTable = pgTable("problems", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  difficulty: text("difficulty").notNull(),
  platform: text("platform").notNull(),
  topics: text("topics").array().notNull().default([]),
  status: text("status").notNull().default("Unsolved"),
  favorite: boolean("favorite").notNull().default(false),
  notes: text("notes").notNull().default(""),
  dateAdded: date("date_added", { mode: "string" }).notNull(),
  solutionLink: text("solution_link").notNull().default(""),
  solvedDate: date("solved_date", { mode: "string" }),
  attempts: integer("attempts").notNull().default(0),
});

export const insertProblemSchema = createInsertSchema(problemsTable).omit({ id: true });
export type InsertProblem = z.infer<typeof insertProblemSchema>;
export type Problem = typeof problemsTable.$inferSelect;