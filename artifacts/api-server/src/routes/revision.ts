import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  db,
  problemsTable,
  revisionQueueTable,
  userStatisticsTable,
  solveHistoryTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { MinHeap } from "../lib/dsa/priority-queue.js";
import {
  sm2Calculate,
  computeRevisionPriority,
} from "../lib/dsa/algorithms.js";
import { z } from "zod/v4";

const router: IRouter = Router();

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] ?? "";
  return param ?? "";
}

const CompleteReviewBody = z.object({
  quality: z.number().int().min(0).max(5), // SM-2 quality rating
});

// ─── Get Revision Queue ───────────────────────────────────────────────────────
router.get(
  "/revision/queue",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.user!.userId;
    const limit = Math.min(
      50,
      parseInt(req.query.limit as string ?? "20", 10),
    );

    // Get all queue entries with their problems
    const entries = await db
      .select({
        queue: revisionQueueTable,
        problem: problemsTable,
      })
      .from(revisionQueueTable)
      .innerJoin(
        problemsTable,
        eq(revisionQueueTable.problemId, problemsTable.id),
      )
      .where(eq(revisionQueueTable.userId, userId))
      .orderBy(desc(revisionQueueTable.nextReviewAt));

    if (entries.length === 0) {
      res.json({ queue: [], stats: { dueToday: 0, reviewRhythm: 0, retention: 0 } });
      return;
    }

    // Use MinHeap Priority Queue to order by computed priority score
    const heap = new MinHeap<(typeof entries)[0]>();

    for (const entry of entries) {
      const score = computeRevisionPriority({
        nextReviewAt: entry.queue.nextReviewAt,
        attempts: entry.problem.attempts,
        difficulty: entry.problem.difficulty,
        priority: entry.queue.priority,
        repetitions: entry.queue.repetitions,
      });
      heap.push(score, entry);
    }

    const topItems = heap.topN(limit);

    const now = new Date();
    const dueToday = entries.filter(
      (e: any) => new Date(e.queue.nextReviewAt) <= now,
    ).length;

    // Calculate review rhythm (average days between reviews)
    const avgInterval =
      entries.reduce((sum: number, e: any) => sum + e.queue.interval, 0) / entries.length;

    // Calculate retention rate (repetitions / total reviews)
    const totalRepetitions = entries.reduce(
      (sum: number, e: any) => sum + e.queue.repetitions,
      0,
    );
    const retentionRate =
      entries.length > 0
        ? Math.min(
            100,
            Math.round((totalRepetitions / (entries.length * 3)) * 100),
          )
        : 0;

    res.json({
      queue: topItems.map(({ queue, problem }) => ({
        ...problem,
        queueId: queue.id,
        nextReviewAt: queue.nextReviewAt,
        interval: queue.interval,
        easeFactor: queue.easeFactor,
        repetitions: queue.repetitions,
        priority: queue.priority,
        isDue: new Date(queue.nextReviewAt) <= now,
      })),
      stats: {
        dueToday,
        reviewRhythm: Math.round(avgInterval * 10) / 10,
        retention: retentionRate,
      },
    });
  },
);

// ─── Complete Review ──────────────────────────────────────────────────────────
router.post(
  "/revision/:problemId/complete",
  requireAuth,
  async (req, res): Promise<void> => {
    const problemId = parseInt(getParam(req.params.problemId), 10);
    if (isNaN(problemId)) {
      res.status(400).json({ error: "Invalid problem id" });
      return;
    }

    const parsed = CompleteReviewBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const userId = req.user!.userId;
    const { quality } = parsed.data;

    const [entry] = await db
      .select()
      .from(revisionQueueTable)
      .where(
        and(
          eq(revisionQueueTable.userId, userId),
          eq(revisionQueueTable.problemId, problemId),
        ),
      )
      .limit(1);

    if (!entry) {
      res.status(404).json({ error: "Revision entry not found" });
      return;
    }

    // Apply SM-2 algorithm to compute next review schedule
    const result = sm2Calculate(
      {
        easeFactor: entry.easeFactor,
        interval: entry.interval,
        repetitions: entry.repetitions,
      },
      quality,
    );

    const [updated] = await db
      .update(revisionQueueTable)
      .set({
        easeFactor: result.easeFactor,
        interval: result.interval,
        repetitions: result.repetitions,
        nextReviewAt: result.nextReviewAt,
        updatedAt: new Date(),
      })
      .where(eq(revisionQueueTable.id, entry.id))
      .returning();

    // Update last revised timestamp on problem
    await db
      .update(problemsTable)
      .set({
        lastRevisedAt: new Date(),
        revisionCount: sql`${problemsTable.revisionCount} + 1`,
      })
      .where(eq(problemsTable.id, problemId));

    res.json({
      ...updated,
      nextReviewAt: result.nextReviewAt,
      message: `Next review in ${result.interval} day${result.interval === 1 ? "" : "s"}`,
    });
  },
);

// ─── Update Priority ──────────────────────────────────────────────────────────
router.patch(
  "/revision/:problemId/priority",
  requireAuth,
  async (req, res): Promise<void> => {
    const problemId = parseInt(getParam(req.params.problemId), 10);
    const { priority } = req.body as { priority: number };

    if (isNaN(problemId) || priority < 1 || priority > 10) {
      res.status(400).json({ error: "Invalid problemId or priority (1-10)" });
      return;
    }

    const userId = req.user!.userId;

    await db
      .update(revisionQueueTable)
      .set({ priority, updatedAt: new Date() })
      .where(
        and(
          eq(revisionQueueTable.userId, userId),
          eq(revisionQueueTable.problemId, problemId),
        ),
      );

    res.json({ message: "Priority updated" });
  },
);

// ─── Revision Stats ───────────────────────────────────────────────────────────
router.get(
  "/revision/stats",
  requireAuth,
  async (req, res): Promise<void> => {
    const userId = req.user!.userId;

    const [stats] = await db
      .select()
      .from(userStatisticsTable)
      .where(eq(userStatisticsTable.userId, userId))
      .limit(1);

    const queueStats = await db
      .select({
        totalInQueue: sql<number>`count(*)::int`,
        avgInterval: sql<number>`avg(${revisionQueueTable.interval})::float`,
        totalRepetitions: sql<number>`sum(${revisionQueueTable.repetitions})::int`,
      })
      .from(revisionQueueTable)
      .where(eq(revisionQueueTable.userId, userId));

    const due = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(revisionQueueTable)
      .where(
        and(
          eq(revisionQueueTable.userId, userId),
          sql`${revisionQueueTable.nextReviewAt} <= now()`,
        ),
      );

    res.json({
      totalInQueue: queueStats[0]?.totalInQueue ?? 0,
      dueNow: due[0]?.count ?? 0,
      avgReviewInterval: Math.round((queueStats[0]?.avgInterval ?? 0) * 10) / 10,
      totalRepetitions: queueStats[0]?.totalRepetitions ?? 0,
      currentStreak: stats?.currentStreak ?? 0,
      longestStreak: stats?.longestStreak ?? 0,
    });
  },
);

export default router;
