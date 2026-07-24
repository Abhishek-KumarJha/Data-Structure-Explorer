import { Router, type IRouter } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
  db,
  problemsTable,
  solveHistoryTable,
  userStatisticsTable,
  revisionQueueTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { PrefixSum } from "../lib/dsa/algorithms.js";

const router: IRouter = Router();

// ─── Analytics Summary ────────────────────────────────────────────────────────
router.get(
  "/analytics/summary",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.user!.userId;

    const [stats] = await db
      .select()
      .from(userStatisticsTable)
      .where(eq(userStatisticsTable.userId, userId))
      .limit(1);

    const problems = await db
      .select()
      .from(problemsTable)
      .where(eq(problemsTable.userId, userId));

    const total = problems.length;
    const solved = problems.filter((p: any) => p.status === "Solved").length;
    const favorites = problems.filter((p: any) => p.favorite).length;
    const bookmarks = problems.filter((p: any) => p.bookmark).length;

    // Difficulty breakdown using HashMap — O(n)
    const diffMap = new Map<string, number>([
      ["Easy", 0],
      ["Medium", 0],
      ["Hard", 0],
    ]);
    for (const p of problems) {
      diffMap.set(p.difficulty, (diffMap.get(p.difficulty) ?? 0) + 1);
    }
    const difficulty = [...diffMap.entries()].map(([name, value]) => ({
      name,
      value,
    }));

    // Topic breakdown — HashMap O(n)
    const topicMap = new Map<string, number>();
    for (const p of problems) {
      for (const topic of p.topics) {
        topicMap.set(topic, (topicMap.get(topic) ?? 0) + 1);
      }
    }
    const topics = [...topicMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));

    // Platform breakdown — HashMap O(n)
    const platformMap = new Map<string, number>();
    for (const p of problems) {
      platformMap.set(p.platform, (platformMap.get(p.platform) ?? 0) + 1);
    }
    const platforms = [...platformMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    // Weekly activity — last 7 days
    const weeklyActivity = await _getWeeklyActivity(userId);

    // Count solved this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weeklyCompleted = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(solveHistoryTable)
      .where(
        and(
          eq(solveHistoryTable.userId, userId),
          gte(solveHistoryTable.solvedAt, oneWeekAgo),
        ),
      );

    const successRate =
      total > 0 ? Math.round((solved / total) * 100) : 0;

    res.json({
      total,
      solved,
      favorites,
      bookmarks,
      successRate,
      weeklyGoal: stats?.lastActiveDate ? 10 : 10,
      weeklyCompleted: weeklyCompleted[0]?.count ?? 0,
      currentStreak: stats?.currentStreak ?? 0,
      longestStreak: stats?.longestStreak ?? 0,
      difficulty,
      topics,
      platforms,
      weeklyActivity,
    });
  },
);

// ─── Heatmap (365 days) ───────────────────────────────────────────────────────
router.get(
  "/analytics/heatmap",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.user!.userId;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const solves = await db
      .select({
        date: sql<string>`date(${solveHistoryTable.solvedAt})::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(solveHistoryTable)
      .where(
        and(
          eq(solveHistoryTable.userId, userId),
          gte(solveHistoryTable.solvedAt, oneYearAgo),
        ),
      )
      .groupBy(sql`date(${solveHistoryTable.solvedAt})`);

    // Build date → count map
    const dateMap = new Map<string, number>();
    for (const s of solves) {
      dateMap.set(s.date, s.count);
    }

    // Generate 365 days of data using Prefix Sum for range queries
    const days: Array<{ date: string; count: number }> = [];
    const counts: number[] = [];

    for (let i = 364; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const count = dateMap.get(dateStr) ?? 0;
      days.push({ date: dateStr, count });
      counts.push(count);
    }

    // Build prefix sum for weekly/monthly aggregations
    const ps = new PrefixSum(counts);

    res.json({
      heatmap: days,
      totalSolvedYear: ps.total,
      lastWeek: ps.rangeSum(358, 364),
      lastMonth: ps.rangeSum(335, 364),
    });
  },
);

// ─── Monthly Progress (last 12 months) ───────────────────────────────────────
router.get(
  "/analytics/monthly",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.user!.userId;

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const monthly = await db
      .select({
        month: sql<string>`to_char(${solveHistoryTable.solvedAt}, 'Mon YYYY')`,
        solved: sql<number>`count(*)::int`,
      })
      .from(solveHistoryTable)
      .where(
        and(
          eq(solveHistoryTable.userId, userId),
          gte(solveHistoryTable.solvedAt, oneYearAgo),
        ),
      )
      .groupBy(
        sql`to_char(${solveHistoryTable.solvedAt}, 'Mon YYYY'), date_trunc('month', ${solveHistoryTable.solvedAt})`,
      )
      .orderBy(
        sql`date_trunc('month', ${solveHistoryTable.solvedAt}) asc`,
      );

    res.json(monthly);
  },
);

// ─── Platform Breakdown ───────────────────────────────────────────────────────
router.get(
  "/analytics/platforms",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.user!.userId;

    const rows = await db
      .select({
        platform: problemsTable.platform,
        total: sql<number>`count(*)::int`,
        solved: sql<number>`count(*) filter (where status = 'Solved')::int`,
      })
      .from(problemsTable)
      .where(eq(problemsTable.userId, userId))
      .groupBy(problemsTable.platform)
      .orderBy(desc(sql`count(*)`));

    res.json(rows);
  },
);

// ─── Topic Analysis ───────────────────────────────────────────────────────────
router.get(
  "/analytics/topics",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.user!.userId;

    const problems = await db
      .select({ topics: problemsTable.topics, status: problemsTable.status })
      .from(problemsTable)
      .where(eq(problemsTable.userId, userId));

    // HashMap for O(n * k) where k = avg topics per problem
    const topicMap = new Map<string, { total: number; solved: number }>();
    for (const p of problems) {
      for (const topic of p.topics) {
        const entry = topicMap.get(topic) ?? { total: 0, solved: 0 };
        entry.total++;
        if (p.status === "Solved") entry.solved++;
        topicMap.set(topic, entry);
      }
    }

    const topics = [...topicMap.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 15)
      .map(([name, { total, solved }]) => ({
        name,
        total,
        solved,
        successRate: total > 0 ? Math.round((solved / total) * 100) : 0,
      }));

    res.json(topics);
  },
);

// ─── Difficulty Analysis ──────────────────────────────────────────────────────
router.get(
  "/analytics/difficulty",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.user!.userId;

    const rows = await db
      .select({
        difficulty: problemsTable.difficulty,
        total: sql<number>`count(*)::int`,
        solved: sql<number>`count(*) filter (where status = 'Solved')::int`,
        avgAttempts: sql<number>`avg(attempts)::float`,
      })
      .from(problemsTable)
      .where(eq(problemsTable.userId, userId))
      .groupBy(problemsTable.difficulty);

    res.json(rows);
  },
);

// ─── Helper: Weekly Activity ─────────────────────────────────────────────────
async function _getWeeklyActivity(
  userId: number,
): Promise<Array<{ day: string; solved: number }>> {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const result = await db
    .select({
      dayOfWeek: sql<number>`extract(dow from ${solveHistoryTable.solvedAt})::int`,
      solved: sql<number>`count(*)::int`,
    })
    .from(solveHistoryTable)
    .where(
      and(
        eq(solveHistoryTable.userId, userId),
        gte(solveHistoryTable.solvedAt, oneWeekAgo),
      ),
    )
    .groupBy(sql`extract(dow from ${solveHistoryTable.solvedAt})`);

  const solveMap = new Map<number, number>(result.map((r: any) => [Number(r.dayOfWeek), Number(r.solved)]));

  // Return Mon–Sun order
  return [1, 2, 3, 4, 5, 6, 0].map((dow) => ({
    day: days[dow],
    solved: solveMap.get(dow) ?? 0,
  }));
}

export default router;
