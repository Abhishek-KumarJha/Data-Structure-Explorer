import { Router, type IRouter } from "express";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db, problemsTable } from "@workspace/db";
import {
  CreateProblemBody,
  CreateProblemResponse,
  DeleteProblemParams,
  ListProblemsQueryParams,
  ListProblemsResponse,
  UpdateProblemBody,
  UpdateProblemParams,
  UpdateProblemResponse,
  GetAnalyticsSummaryResponse,
  GetRevisionQueueResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
let seedPromise: Promise<void> | null = null;

const titles = [
  "Two Sum", "Valid Parentheses", "Binary Search", "Merge Intervals",
  "Longest Substring Without Repeating Characters", "Maximum Subarray",
  "Course Schedule", "Number of Islands", "Climbing Stairs", "Coin Change",
  "Word Break", "Min Stack", "Top K Frequent Elements", "Product of Array Except Self",
  "Rotate Image", "House Robber", "Linked List Cycle", "3Sum", "Subsets", "Meeting Rooms",
];
const topicSets = [
  ["Arrays", "Hashing"], ["Strings", "Stack"], ["Binary Search"], ["Greedy", "Sorting"],
  ["Sliding Window", "Strings"], ["Arrays", "Dynamic Programming"], ["Graphs", "BFS"],
  ["Graphs", "DFS"], ["Dynamic Programming"], ["Dynamic Programming"],
  ["Dynamic Programming", "Strings"], ["Stack"], ["Hashing", "Heap"],
  ["Arrays", "Prefix Sum"], ["Matrix"], ["Dynamic Programming"], ["Linked List"],
  ["Two Pointers"], ["Backtracking"], ["Sorting", "Greedy"],
];
const platforms = ["LeetCode", "Codeforces", "CSES", "AtCoder"];
const difficulties = ["Easy", "Medium", "Hard"] as const;

async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = (async () => {
      const existing = await db.select({ id: problemsTable.id }).from(problemsTable).limit(1);
      if (existing.length > 0) return;
      const rows = Array.from({ length: 100 }, (_, index) => {
        const base = index % titles.length;
        const difficulty = difficulties[(index * 7) % difficulties.length];
        const solved = index % 3 !== 0;
        const date = new Date(Date.now() - (100 - index) * 86400000).toISOString().slice(0, 10);
        return {
          title: index < titles.length ? titles[index] : `${titles[base]} — Pattern ${Math.floor(index / titles.length) + 1}`,
          difficulty,
          platform: platforms[index % platforms.length],
          topics: topicSets[base],
          status: solved ? "Solved" : "Unsolved",
          favorite: index % 9 === 0,
          notes: "",
          dateAdded: date,
          solutionLink: "",
          solvedDate: solved ? date : null,
          attempts: (index * 3) % 6,
        };
      });
      await db.insert(problemsTable).values(rows);
    })();
  }
  await seedPromise;
}

router.get("/problems", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = ListProblemsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { search, difficulty, platform, status, favoritesOnly } = parsed.data;
  const filters = [];
  if (search) {
    filters.push(or(ilike(problemsTable.title, `%${search}%`), ilike(problemsTable.platform, `%${search}%`)));
  }
  if (difficulty && difficulty !== "All") filters.push(eq(problemsTable.difficulty, difficulty));
  if (platform) filters.push(eq(problemsTable.platform, platform));
  if (status && status !== "All") filters.push(eq(problemsTable.status, status));
  if (favoritesOnly) filters.push(eq(problemsTable.favorite, true));
  const rows = await db.select().from(problemsTable).where(filters.length ? and(...filters) : undefined).orderBy(asc(problemsTable.id));
  res.json(ListProblemsResponse.parse(rows));
});

router.post("/problems", async (req, res): Promise<void> => {
  await ensureSeeded();
  const parsed = CreateProblemBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [problem] = await db.insert(problemsTable).values({
    ...parsed.data,
    dateAdded: new Date().toISOString().slice(0, 10),
  }).returning();
  res.status(201).json(CreateProblemResponse.parse(problem));
});

router.patch("/problems/:id", async (req, res): Promise<void> => {
  await ensureSeeded();
  const params = UpdateProblemParams.safeParse(req.params);
  const parsed = UpdateProblemBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const update = { ...parsed.data };
  if (update.status === "Solved") {
    Object.assign(update, { solvedDate: new Date().toISOString().slice(0, 10) });
  }
  const [problem] = await db.update(problemsTable).set(update).where(eq(problemsTable.id, params.data.id)).returning();
  if (!problem) {
    res.status(404).json({ error: "Problem not found" });
    return;
  }
  res.json(UpdateProblemResponse.parse(problem));
});

router.delete("/problems/:id", async (req, res): Promise<void> => {
  await ensureSeeded();
  const params = DeleteProblemParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [problem] = await db.delete(problemsTable).where(eq(problemsTable.id, params.data.id)).returning();
  if (!problem) {
    res.status(404).json({ error: "Problem not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/analytics/summary", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const rows = await db.select().from(problemsTable);
  const difficulty = difficulties.map((name) => ({ name, value: rows.filter((row) => row.difficulty === name).length }));
  const topicCounts = new Map<string, number>();
  rows.forEach((row) => row.topics.forEach((topic) => topicCounts.set(topic, (topicCounts.get(topic) ?? 0) + 1)));
  const topics = [...topicCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }));
  const weeklyActivity = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => ({ day, solved: rows.filter((row) => row.status === "Solved" && row.solvedDate && new Date(row.solvedDate).getDay() === (index + 1) % 7).length % 8 }));
  res.json(GetAnalyticsSummaryResponse.parse({
    total: rows.length,
    solved: rows.filter((row) => row.status === "Solved").length,
    favorites: rows.filter((row) => row.favorite).length,
    weeklyGoal: 12,
    weeklyCompleted: Math.min(12, rows.filter((row) => row.status === "Solved").length % 13),
    difficulty, topics, weeklyActivity,
  }));
});

router.get("/analytics/revision-queue", async (_req, res): Promise<void> => {
  await ensureSeeded();
  const rows = await db.select().from(problemsTable).where(eq(problemsTable.status, "Solved")).orderBy(desc(problemsTable.attempts), asc(problemsTable.solvedDate)).limit(12);
  res.json(GetRevisionQueueResponse.parse(rows));
});

export default router;