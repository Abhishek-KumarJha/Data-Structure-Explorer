import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import {
  db,
  problemsTable,
  solveHistoryTable,
  userStatisticsTable,
  revisionQueueTable,
  favoritesTable,
  bookmarksTable,
} from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { buildProblemSearchFilters } from "../lib/search-filters.js";
import { invalidateTrieCache } from "./search.js";
import { z } from "zod/v4";

const router: IRouter = Router();

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] ?? "";
  return param ?? "";
}

// ─── Schemas ──────────────────────────────────────────────────────────────────
const ListProblemsQuery = z.object({
  search: z.string().optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard", "All"]).optional(),
  platform: z.string().optional(),
  status: z.enum(["Solved", "Unsolved", "All"]).optional(),
  favoritesOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  bookmarksOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  topic: z.string().optional(),
  company: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((v) => Math.max(1, parseInt(v ?? "1", 10))),
  limit: z
    .string()
    .optional()
    .transform((v) => Math.min(100, Math.max(1, parseInt(v ?? "50", 10)))),
  sortBy: z
    .enum(["dateAdded", "title", "difficulty", "attempts", "solvedDate"])
    .optional()
    .default("dateAdded"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

const CreateProblemBody = z.object({
  title: z.string().min(1).max(300),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  platform: z.string().min(1).max(100),
  topics: z.array(z.string()).default([]),
  companyTags: z.array(z.string()).default([]),
  solutionLink: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  status: z.enum(["Solved", "Unsolved"]).optional().default("Unsolved"),
});

const UpdateProblemBody = z.object({
  title: z.string().min(1).max(300).optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).optional(),
  platform: z.string().optional(),
  topics: z.array(z.string()).optional(),
  companyTags: z.array(z.string()).optional(),
  status: z.enum(["Solved", "Unsolved"]).optional(),
  favorite: z.boolean().optional(),
  bookmark: z.boolean().optional(),
  notes: z.string().optional(),
  solutionLink: z.string().optional(),
  attempts: z.number().int().min(0).optional(),
});

// ─── List Problems ────────────────────────────────────────────────────────────
router.get("/problems", requireAuth, async (req, res): Promise<void> => {
  const parsed = ListProblemsQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { search, difficulty, platform, status, favoritesOnly, bookmarksOnly,
    topic, company, page, limit, sortBy, sortOrder } = parsed.data;

  const userId = req.user!.userId;
  const offset = (page - 1) * limit;

  const filters = buildProblemSearchFilters({
    userId,
    search,
    difficulty,
    platform,
    status,
    favoritesOnly,
    bookmarksOnly,
    topic,
    company,
  });

  // Dynamic sorting with deterministic secondary order
  const sortCol =
    sortBy === "title"
      ? problemsTable.title
      : sortBy === "difficulty"
        ? problemsTable.difficulty
        : sortBy === "attempts"
          ? problemsTable.attempts
          : sortBy === "solvedDate"
            ? problemsTable.solvedDate
            : problemsTable.dateAdded;

  const orderFn = sortOrder === "asc" ? asc : desc;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(problemsTable)
      .where(and(...filters))
      .orderBy(orderFn(sortCol), desc(problemsTable.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(problemsTable)
      .where(and(...filters)),
  ]);

  res.json({
    problems: rows,
    total: countResult[0]?.count ?? 0,
    page,
    limit,
    totalPages: Math.ceil((countResult[0]?.count ?? 0) / limit),
  });
});

// ─── Create Problem ───────────────────────────────────────────────────────────
router.post("/problems", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateProblemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.user!.userId;
  const today = new Date().toISOString().slice(0, 10);

  const [problem] = await db.transaction(async (tx: any) => {
    const [p] = await tx
      .insert(problemsTable)
      .values({
        userId,
        ...parsed.data,
        dateAdded: today,
        solvedDate: parsed.data.status === "Solved" ? today : null,
      })
      .returning();

    // If solved, add to solve history and update stats atomically
    if (p.status === "Solved") {
      await _recordSolveTx(tx, userId, p.id, p.difficulty, p.platform);
      await _upsertRevisionQueueTx(tx, userId, p.id);
    }
    return [p];
  });

  invalidateTrieCache(userId);
  res.status(201).json(problem);
});

// ─── Update Problem ───────────────────────────────────────────────────────────
router.patch("/problems/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(getParam(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid problem id" });
    return;
  }

  const parsed = UpdateProblemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.user!.userId;

  // Verify ownership
  const [existing] = await db
    .select()
    .from(problemsTable)
    .where(and(eq(problemsTable.id, id), eq(problemsTable.userId, userId)))
    .limit(1);

  if (!existing) {
    res.status(404).json({ error: "Problem not found" });
    return;
  }

  const update: Record<string, unknown> = { ...parsed.data };

  // Auto-set solvedDate when status changes to Solved
  const wasUnsolved = existing.status === "Unsolved";
  const isNowSolved = parsed.data.status === "Solved";

  if (wasUnsolved && isNowSolved) {
    update.solvedDate = new Date().toISOString().slice(0, 10);
    update.attempts = (existing.attempts ?? 0) + 1;
  } else if (parsed.data.status === "Unsolved") {
    update.solvedDate = null;
  }

  const updated = await db.transaction(async (tx: any) => {
    const [u] = await tx
      .update(problemsTable)
      .set(update)
      .where(and(eq(problemsTable.id, id), eq(problemsTable.userId, userId)))
      .returning();

    // Reconcile favorites table
    if (parsed.data.favorite !== undefined) {
      if (parsed.data.favorite) {
        await tx
          .insert(favoritesTable)
          .values({ userId, problemId: id })
          .onConflictDoNothing();
      } else {
        await tx
          .delete(favoritesTable)
          .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.problemId, id)));
      }
    }

    // Reconcile bookmarks table
    if (parsed.data.bookmark !== undefined) {
      if (parsed.data.bookmark) {
        await tx
          .insert(bookmarksTable)
          .values({ userId, problemId: id })
          .onConflictDoNothing();
      } else {
        await tx
          .delete(bookmarksTable)
          .where(and(eq(bookmarksTable.userId, userId), eq(bookmarksTable.problemId, id)));
      }
    }

    if (wasUnsolved && isNowSolved) {
      await _recordSolveTx(tx, userId, id, u.difficulty, u.platform);
      await _upsertRevisionQueueTx(tx, userId, id);
    } else if (existing.status === "Solved" && parsed.data.status === "Unsolved") {
      await tx
        .update(userStatisticsTable)
        .set({
          totalSolved: sql`GREATEST(0, ${userStatisticsTable.totalSolved} - 1)`,
          updatedAt: new Date(),
        })
        .where(eq(userStatisticsTable.userId, userId));
    }

    return u;
  });

  if (parsed.data.title || parsed.data.platform || parsed.data.difficulty) {
    invalidateTrieCache(userId);
  }

  res.json(updated);
});

// ─── Delete Problem ───────────────────────────────────────────────────────────
router.delete("/problems/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(getParam(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid problem id" });
    return;
  }

  const userId = req.user!.userId;

  const [deleted] = await db
    .delete(problemsTable)
    .where(and(eq(problemsTable.id, id), eq(problemsTable.userId, userId)))
    .returning({ id: problemsTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Problem not found" });
    return;
  }

  invalidateTrieCache(userId);
  res.sendStatus(204);
});

// ─── Get Single Problem ───────────────────────────────────────────────────────
router.get("/problems/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(getParam(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid problem id" });
    return;
  }

  const userId = req.user!.userId;

  const [problem] = await db
    .select()
    .from(problemsTable)
    .where(and(eq(problemsTable.id, id), eq(problemsTable.userId, userId)))
    .limit(1);

  if (!problem) {
    res.status(404).json({ error: "Problem not found" });
    return;
  }

  res.json(problem);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function _recordSolveTx(
  client: any,
  userId: number,
  problemId: number,
  difficulty: string,
  platform: string,
): Promise<void> {
  await client.insert(solveHistoryTable).values({
    userId,
    problemId,
    difficulty,
    platform,
  });

  // Update/upsert user statistics with streak calculation
  const today = new Date().toISOString().slice(0, 10);
  const [stats] = await client
    .select()
    .from(userStatisticsTable)
    .where(eq(userStatisticsTable.userId, userId))
    .limit(1);

  if (!stats) {
    await client.insert(userStatisticsTable).values({
      userId,
      totalSolved: 1,
      totalAttempted: 1,
      currentStreak: 1,
      longestStreak: 1,
      lastActiveDate: today,
    });
    return;
  }

  const lastActive = stats.lastActiveDate;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);

  let newStreak = stats.currentStreak;
  if (lastActive === today) {
    // Same day — no streak change
  } else if (lastActive === yesterdayStr) {
    newStreak = stats.currentStreak + 1;
  } else {
    newStreak = 1; // streak broken
  }

  await client
    .update(userStatisticsTable)
    .set({
      totalSolved: stats.totalSolved + 1,
      totalAttempted: stats.totalAttempted + 1,
      currentStreak: newStreak,
      longestStreak: Math.max(stats.longestStreak, newStreak),
      lastActiveDate: today,
      updatedAt: new Date(),
    })
    .where(eq(userStatisticsTable.userId, userId));
}

async function _upsertRevisionQueueTx(
  client: any,
  userId: number,
  problemId: number,
): Promise<void> {
  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + 1); // review in 1 day

  await client
    .insert(revisionQueueTable)
    .values({ userId, problemId, nextReviewAt })
    .onConflictDoNothing(); // don't reset if already in queue
}

export default router;