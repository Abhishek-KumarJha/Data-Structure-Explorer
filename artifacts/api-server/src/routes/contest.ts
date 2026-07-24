import { Router, type IRouter } from "express";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db, contestsTable, contestProblemsTable, problemsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { greedyContestSelection } from "../lib/dsa/algorithms.js";
import { z } from "zod/v4";

const router: IRouter = Router();

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] ?? "";
  return param ?? "";
}

const CreateContestBody = z.object({
  name: z.string().min(1).max(200).optional().default("My Contest"),
  type: z.enum(["random", "custom"]).default("random"),
  durationMinutes: z.number().int().min(10).max(300).default(90),
  problemIds: z.array(z.number().int()).optional(), // for custom contest
  problemCount: z.number().int().min(2).max(8).default(4),
  difficulty: z.enum(["Easy", "Medium", "Hard", "Mixed"]).default("Mixed"),
});

const SubmitProblemBody = z.object({
  timeTakenSeconds: z.number().int().min(0).optional(),
});

// ─── List Contests ────────────────────────────────────────────────────────────
router.get("/contests", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const page = Math.max(1, parseInt(req.query.page as string ?? "1", 10));
  const limit = 10;
  const offset = (page - 1) * limit;

  const contests = await db
    .select()
    .from(contestsTable)
    .where(eq(contestsTable.userId, userId))
    .orderBy(desc(contestsTable.startedAt))
    .limit(limit)
    .offset(offset);

  // Get problem counts for each contest
  const enriched = await Promise.all(
    contests.map(async (contest: any) => {
      const [counts] = await db
        .select({
          total: sql<number>`count(*)::int`,
          solved: sql<number>`count(*) filter (where solved = true)::int`,
        })
        .from(contestProblemsTable)
        .where(eq(contestProblemsTable.contestId, contest.id));

      return { ...contest, totalProblems: counts?.total ?? 0, solvedCount: counts?.solved ?? 0 };
    }),
  );

  res.json(enriched);
});

// ─── Create Contest ───────────────────────────────────────────────────────────
router.post("/contests", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateContestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.user!.userId;
  const { name, type, durationMinutes, problemIds, problemCount, difficulty } = parsed.data;

  const endsAt = new Date();
  endsAt.setMinutes(endsAt.getMinutes() + durationMinutes);

  // Determine problem set
  let selectedIds: number[] = [];

  if (type === "custom" && problemIds?.length) {
    selectedIds = problemIds.slice(0, 8);
  } else {
    // Random selection using greedy algorithm
    const pool = await db
      .select()
      .from(problemsTable)
      .where(
        and(
          eq(problemsTable.userId, userId),
          ...(difficulty !== "Mixed" ? [eq(problemsTable.difficulty, difficulty)] : []),
        ),
      );

    if (pool.length < 2) {
      res.status(400).json({ error: "Not enough problems in your library. Add at least 2 problems first." });
      return;
    }

    const selected = greedyContestSelection(pool, Math.min(problemCount, pool.length));
    selectedIds = selected.map((p) => p.id);
  }

  // Create contest
  const [contest] = await db
    .insert(contestsTable)
    .values({ userId, name, type, durationMinutes, endsAt })
    .returning();

  // Assign problems with labels A, B, C, ...
  const labels = "ABCDEFGH";
  const contestProblems = selectedIds.map((problemId, i) => ({
    contestId: contest.id,
    problemId,
    label: labels[i] ?? String(i + 1),
  }));

  await db.insert(contestProblemsTable).values(contestProblems);

  // Return full contest with problems
  const problems = await db
    .select({ cp: contestProblemsTable, p: problemsTable })
    .from(contestProblemsTable)
    .innerJoin(problemsTable, eq(contestProblemsTable.problemId, problemsTable.id))
    .where(eq(contestProblemsTable.contestId, contest.id))
    .orderBy(contestProblemsTable.label);

  res.status(201).json({
    ...contest,
    problems: problems.map(({ cp, p }: { cp: any; p: any }) => ({ ...p, label: cp.label, solved: cp.solved, timeTakenSeconds: cp.timeTakenSeconds })),
  });
});

// ─── Get Contest ──────────────────────────────────────────────────────────────
router.get("/contests/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(getParam(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid contest id" });
    return;
  }

  const userId = req.user!.userId;

  const [contest] = await db
    .select()
    .from(contestsTable)
    .where(and(eq(contestsTable.id, id), eq(contestsTable.userId, userId)))
    .limit(1);

  if (!contest) {
    res.status(404).json({ error: "Contest not found" });
    return;
  }

  const problems = await db
    .select({ cp: contestProblemsTable, p: problemsTable })
    .from(contestProblemsTable)
    .innerJoin(problemsTable, eq(contestProblemsTable.problemId, problemsTable.id))
    .where(eq(contestProblemsTable.contestId, id))
    .orderBy(contestProblemsTable.label);

  const timeRemaining = Math.max(0, Math.floor((new Date(contest.endsAt).getTime() - Date.now()) / 1000));

  res.json({
    ...contest,
    timeRemaining,
    problems: problems.map(({ cp, p }: { cp: any; p: any }) => ({
      ...p,
      label: cp.label,
      solved: cp.solved,
      submittedAt: cp.submittedAt,
      timeTakenSeconds: cp.timeTakenSeconds,
    })),
  });
});

// ─── Submit Problem ───────────────────────────────────────────────────────────
router.post(
  "/contests/:contestId/problems/:problemId/submit",
  requireAuth,
  async (req, res): Promise<void> => {
    const contestId = parseInt(getParam(req.params.contestId), 10);
    const problemId = parseInt(getParam(req.params.problemId), 10);

    if (isNaN(contestId) || isNaN(problemId)) {
      res.status(400).json({ error: "Invalid ids" });
      return;
    }

    const parsed = SubmitProblemBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const userId = req.user!.userId;

    // Verify contest belongs to user and is active
    const [contest] = await db
      .select()
      .from(contestsTable)
      .where(and(eq(contestsTable.id, contestId), eq(contestsTable.userId, userId)))
      .limit(1);

    if (!contest) {
      res.status(404).json({ error: "Contest not found" });
      return;
    }

    if (contest.status !== "active") {
      res.status(400).json({ error: "Contest is not active" });
      return;
    }

    // Mark problem as solved
    await db
      .update(contestProblemsTable)
      .set({
        solved: true,
        submittedAt: new Date(),
        timeTakenSeconds: parsed.data.timeTakenSeconds,
      })
      .where(
        and(
          eq(contestProblemsTable.contestId, contestId),
          eq(contestProblemsTable.problemId, problemId),
        ),
      );

    // Update contest score
    const [stats] = await db
      .select({ solved: sql<number>`count(*) filter (where solved = true)::int` })
      .from(contestProblemsTable)
      .where(eq(contestProblemsTable.contestId, contestId));

    await db
      .update(contestsTable)
      .set({ score: stats?.solved ?? 0 })
      .where(eq(contestsTable.id, contestId));

    res.json({ message: "Problem submitted", score: stats?.solved ?? 0 });
  },
);

// ─── Complete Contest ─────────────────────────────────────────────────────────
router.patch("/contests/:id/complete", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(getParam(req.params.id), 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid contest id" });
    return;
  }

  const userId = req.user!.userId;

  const [updated] = await db
    .update(contestsTable)
    .set({ status: "completed", completedAt: new Date() })
    .where(and(eq(contestsTable.id, id), eq(contestsTable.userId, userId)))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Contest not found" });
    return;
  }

  res.json(updated);
});

// ─── Contest History Stats ────────────────────────────────────────────────────
router.get("/contests/history/stats", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where status = 'completed')::int`,
      avgScore: sql<number>`avg(score)::float`,
      bestScore: sql<number>`max(score)::int`,
    })
    .from(contestsTable)
    .where(eq(contestsTable.userId, userId));

  res.json({
    totalContests: totals?.total ?? 0,
    completed: totals?.completed ?? 0,
    avgScore: Math.round((totals?.avgScore ?? 0) * 10) / 10,
    bestScore: totals?.bestScore ?? 0,
  });
});

export default router;
