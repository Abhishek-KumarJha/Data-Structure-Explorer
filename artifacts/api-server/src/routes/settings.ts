import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, usersTable, problemsTable, solveHistoryTable, revisionQueueTable,
  searchHistoryTable, notesTable, contestsTable, importExportHistoryTable, userStatisticsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { z } from "zod/v4";

const router: IRouter = Router();

const UpdateSettingsBody = z.object({
  weeklyGoal: z.number().int().min(1).max(100).optional(),
  theme: z.enum(["light", "dark"]).optional(),
});

// ─── Get Settings ─────────────────────────────────────────────────────────────
router.get("/settings", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const [user] = await db
    .select({ weeklyGoal: usersTable.weeklyGoal, theme: usersTable.theme })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const [stats] = await db
    .select()
    .from(userStatisticsTable)
    .where(eq(userStatisticsTable.userId, userId))
    .limit(1);

  res.json({
    weeklyGoal: user?.weeklyGoal ?? 10,
    theme: user?.theme ?? "dark",
    totalSolved: stats?.totalSolved ?? 0,
    currentStreak: stats?.currentStreak ?? 0,
    longestStreak: stats?.longestStreak ?? 0,
  });
});

// ─── Update Settings ──────────────────────────────────────────────────────────
router.patch("/settings", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.user!.userId;
  const update: Record<string, unknown> = { updatedAt: new Date() };

  if (parsed.data.weeklyGoal !== undefined) update.weeklyGoal = parsed.data.weeklyGoal;
  if (parsed.data.theme) update.theme = parsed.data.theme;

  const [user] = await db
    .update(usersTable)
    .set(update)
    .where(eq(usersTable.id, userId))
    .returning({ weeklyGoal: usersTable.weeklyGoal, theme: usersTable.theme });

  res.json(user);
});

// ─── Reset Account (delete all user data) ────────────────────────────────────
router.post("/settings/reset", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  // Delete all user data in correct order (respect foreign keys)
  await db.delete(notesTable).where(eq(notesTable.userId, userId));
  await db.delete(searchHistoryTable).where(eq(searchHistoryTable.userId, userId));
  await db.delete(importExportHistoryTable).where(eq(importExportHistoryTable.userId, userId));
  await db.delete(revisionQueueTable).where(eq(revisionQueueTable.userId, userId));
  await db.delete(contestsTable).where(eq(contestsTable.userId, userId));
  await db.delete(solveHistoryTable).where(eq(solveHistoryTable.userId, userId));
  await db.delete(problemsTable).where(eq(problemsTable.userId, userId));

  // Reset statistics
  await db
    .update(userStatisticsTable)
    .set({
      totalSolved: 0,
      totalAttempted: 0,
      currentStreak: 0,
      lastActiveDate: null,
      updatedAt: new Date(),
    })
    .where(eq(userStatisticsTable.userId, userId));

  res.json({ message: "Account data reset successfully" });
});

export default router;
