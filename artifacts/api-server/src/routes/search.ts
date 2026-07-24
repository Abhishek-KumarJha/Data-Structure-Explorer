import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db, problemsTable, searchHistoryTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { Trie } from "../lib/dsa/trie.js";
import { z } from "zod/v4";

const router: IRouter = Router();

// In-memory Trie cache per user (reset on server restart, rebuilt on demand)
// In production, consider Redis for distributed caching
const userTries = new Map<number, { trie: Trie; builtAt: number }>();
const TRIE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

async function getOrBuildTrie(userId: number): Promise<Trie> {
  const cached = userTries.get(userId);
  if (cached && Date.now() - cached.builtAt < TRIE_TTL_MS) {
    return cached.trie;
  }

  // Build Trie from user's problems — O(n * k)
  const problems = await db
    .select({
      id: problemsTable.id,
      title: problemsTable.title,
      platform: problemsTable.platform,
      difficulty: problemsTable.difficulty,
    })
    .from(problemsTable)
    .where(eq(problemsTable.userId, userId));

  const trie = new Trie();
  for (const p of problems) {
    // Index each word in title separately for better autocomplete
    const words = p.title.split(/\s+/);
    trie.insert(p.title, { id: p.id, platform: p.platform, difficulty: p.difficulty });
    for (const word of words) {
      if (word.length >= 3) {
        // Only index words 3+ chars
        trie.insert(word, { id: p.id, platform: p.platform, difficulty: p.difficulty });
      }
    }
  }

  userTries.set(userId, { trie, builtAt: Date.now() });
  return trie;
}

// Invalidate cached Trie when problems change
export function invalidateTrieCache(userId: number): void {
  userTries.delete(userId);
}

const SearchQuery = z.object({
  q: z.string().min(1).max(200),
  difficulty: z.enum(["Easy", "Medium", "Hard", "All"]).optional(),
  platform: z.string().optional(),
  status: z.enum(["Solved", "Unsolved", "All"]).optional(),
  topic: z.string().optional(),
  company: z.string().optional(),
  favoritesOnly: z.string().optional().transform((v) => v === "true"),
  limit: z.string().optional().transform((v) => Math.min(50, parseInt(v ?? "20", 10))),
});

// ─── Full-text Search ─────────────────────────────────────────────────────────
router.get("/search", requireAuth, async (req, res): Promise<void> => {
  const parsed = SearchQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { q, difficulty, platform, status, topic, company, favoritesOnly, limit } = parsed.data;
  const userId = req.user!.userId;

  const filters = [
    eq(problemsTable.userId, userId),
    or(
      ilike(problemsTable.title, `%${q}%`),
      ilike(problemsTable.platform, `%${q}%`),
      sql`${problemsTable.topics}::text ilike ${"%" + q + "%"}`,
      sql`${problemsTable.companyTags}::text ilike ${"%" + q + "%"}`,
    )!,
  ];

  if (difficulty && difficulty !== "All") filters.push(eq(problemsTable.difficulty, difficulty));
  if (platform) filters.push(ilike(problemsTable.platform, `%${platform}%`));
  if (status && status !== "All") filters.push(eq(problemsTable.status, status));
  if (topic) filters.push(sql`${problemsTable.topics}::text ilike ${"%" + topic + "%"}`);
  if (company) filters.push(sql`${problemsTable.companyTags}::text ilike ${"%" + company + "%"}`);
  if (favoritesOnly) filters.push(eq(problemsTable.favorite, true));

  const results = await db
    .select()
    .from(problemsTable)
    .where(and(...filters))
    .limit(limit);

  // Save to search history (non-blocking)
  db.insert(searchHistoryTable)
    .values({ userId, query: q, resultCount: results.length })
    .catch(() => {}); // swallow error — not critical

  res.json({ results, total: results.length, query: q });
});

// ─── Autocomplete (Trie-based) ────────────────────────────────────────────────
router.get("/search/autocomplete", requireAuth, async (req, res): Promise<void> => {
  const q = String(req.query.q ?? "").trim();
  if (!q || q.length < 2) {
    res.json([]);
    return;
  }

  const userId = req.user!.userId;
  const trie = await getOrBuildTrie(userId);
  const suggestions = trie.search(q, 8);

  res.json(suggestions);
});

// ─── Search History ───────────────────────────────────────────────────────────
router.get("/search/history", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;
  const limit = Math.min(20, parseInt(req.query.limit as string ?? "10", 10));

  const history = await db
    .select()
    .from(searchHistoryTable)
    .where(eq(searchHistoryTable.userId, userId))
    .orderBy(desc(searchHistoryTable.searchedAt))
    .limit(limit);

  // Deduplicate by query (keep most recent)
  const seen = new Set<string>();
  const unique = history.filter((h: any) => {
    if (seen.has(h.query)) return false;
    seen.add(h.query);
    return true;
  });

  res.json(unique);
});

// ─── Clear Search History ─────────────────────────────────────────────────────
router.delete("/search/history", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  await db.delete(searchHistoryTable).where(eq(searchHistoryTable.userId, userId));

  res.json({ message: "Search history cleared" });
});

export default router;
