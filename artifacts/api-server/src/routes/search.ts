import { Router, type IRouter } from "express";
import { and, desc, eq, gt, ilike, or, sql } from "drizzle-orm";
import { db, problemsTable, searchHistoryTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { Trie, type SearchSuggestion } from "../lib/dsa/trie.js";
import { buildProblemSearchFilters, sanitizeSearchQuery } from "../lib/search-filters.js";
import { z } from "zod/v4";

const router: IRouter = Router();

// In-memory Trie cache per user (rebuilt on demand or invalidated on mutations)
const userTries = new Map<number, { trie: Trie; builtAt: number }>();
const TRIE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

async function getOrBuildTrie(userId: number): Promise<Trie> {
  const cached = userTries.get(userId);
  if (cached && Date.now() - cached.builtAt < TRIE_TTL_MS) {
    return cached.trie;
  }

  const problems = await db
    .select({
      id: problemsTable.id,
      title: problemsTable.title,
      platform: problemsTable.platform,
      difficulty: problemsTable.difficulty,
      topics: problemsTable.topics,
    })
    .from(problemsTable)
    .where(eq(problemsTable.userId, userId));

  const trie = new Trie();
  for (const p of problems) {
    const meta = {
      id: p.id,
      title: p.title,
      platform: p.platform,
      difficulty: p.difficulty,
      topics: p.topics,
    };

    // Index full title
    trie.insert(p.title, meta);

    // Index word tokens
    const words = p.title.split(/[\s\-_:,.]+/);
    for (const word of words) {
      if (word.length >= 2) {
        trie.insert(word, meta);
      }
    }

    // Index platform
    trie.insert(p.platform, meta);

    // Index topics
    for (const topic of p.topics) {
      trie.insert(topic, meta);
    }
  }

  userTries.set(userId, { trie, builtAt: Date.now() });
  return trie;
}

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
  bookmarksOnly: z.string().optional().transform((v) => v === "true"),
  page: z.string().optional().transform((v) => Math.max(1, parseInt(v ?? "1", 10))),
  limit: z.string().optional().transform((v) => Math.min(50, Math.max(1, parseInt(v ?? "20", 10)))),
});

async function recordSearchHistory(userId: number, rawQuery: string, resultCount: number): Promise<void> {
  const query = rawQuery.trim();
  if (!query) return;

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  // Check if identical query was recorded within the last 5 minutes
  const [existing] = await db
    .select({ id: searchHistoryTable.id })
    .from(searchHistoryTable)
    .where(
      and(
        eq(searchHistoryTable.userId, userId),
        eq(searchHistoryTable.query, query),
        gt(searchHistoryTable.searchedAt, fiveMinutesAgo),
      ),
    )
    .limit(1);

  if (existing) {
    // Update timestamp and result count instead of creating duplicate row
    await db
      .update(searchHistoryTable)
      .set({ searchedAt: new Date(), resultCount })
      .where(eq(searchHistoryTable.id, existing.id));
  } else {
    await db
      .insert(searchHistoryTable)
      .values({ userId, query, resultCount })
      .catch(() => {});
  }
}

// ─── Full-text Search ─────────────────────────────────────────────────────────
router.get("/search", requireAuth, async (req, res): Promise<void> => {
  const parsed = SearchQuery.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    q,
    difficulty,
    platform,
    status,
    topic,
    company,
    favoritesOnly,
    bookmarksOnly,
    page,
    limit,
  } = parsed.data;

  const userId = req.user!.userId;
  const offset = (page - 1) * limit;

  const filters = buildProblemSearchFilters({
    userId,
    search: q,
    difficulty,
    platform,
    status,
    favoritesOnly,
    bookmarksOnly,
    topic,
    company,
  });

  const [results, countResult] = await Promise.all([
    db
      .select()
      .from(problemsTable)
      .where(and(...filters))
      .orderBy(desc(problemsTable.dateAdded), desc(problemsTable.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(problemsTable)
      .where(and(...filters)),
  ]);

  const total = countResult[0]?.count ?? 0;

  // Record history non-blocking
  recordSearchHistory(userId, q, total).catch(() => {});

  res.json({
    query: q,
    results,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

// ─── Autocomplete ─────────────────────────────────────────────────────────────
router.get("/search/autocomplete", requireAuth, async (req, res): Promise<void> => {
  const q = sanitizeSearchQuery(String(req.query.q ?? ""));
  const limitParam = parseInt(String(req.query.limit ?? "8"), 10);
  const limit = Math.min(20, Math.max(1, isNaN(limitParam) ? 8 : limitParam));

  if (!q || q.length < 1) {
    res.json({ suggestions: [] });
    return;
  }

  const userId = req.user!.userId;
  const trie = await getOrBuildTrie(userId);
  const suggestions: SearchSuggestion[] = trie.search(q, limit);

  // If Trie prefix returned fewer than limit, supplement with substring database search
  if (suggestions.length < limit) {
    const dbMatches = await db
      .select({
        id: problemsTable.id,
        title: problemsTable.title,
        platform: problemsTable.platform,
        difficulty: problemsTable.difficulty,
        topics: problemsTable.topics,
      })
      .from(problemsTable)
      .where(
        and(
          eq(problemsTable.userId, userId),
          or(
            ilike(problemsTable.title, `%${q}%`),
            ilike(problemsTable.platform, `%${q}%`),
            sql`${problemsTable.topics}::text ilike ${"%" + q + "%"}`,
          )!,
        ),
      )
      .limit(limit);

    for (const match of dbMatches) {
      if (!suggestions.some((s) => s.id === match.id)) {
        suggestions.push(match);
        if (suggestions.length >= limit) break;
      }
    }
  }

  res.json({ suggestions });
});

// ─── Record Search History explicitly ─────────────────────────────────────────
router.post("/search/history", requireAuth, async (req, res): Promise<void> => {
  const q = sanitizeSearchQuery(String(req.body.query ?? ""));
  if (!q) {
    res.status(400).json({ error: "Query is required" });
    return;
  }

  const userId = req.user!.userId;
  const resultCount = typeof req.body.resultCount === "number" ? req.body.resultCount : 0;
  await recordSearchHistory(userId, q, resultCount);

  res.status(201).json({ message: "Search history recorded" });
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
    const key = h.query.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  res.json(unique);
});

// ─── Delete Individual Search History Item ────────────────────────────────────
router.delete("/search/history/:id", requireAuth, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid history id" });
    return;
  }

  const userId = req.user!.userId;
  await db
    .delete(searchHistoryTable)
    .where(and(eq(searchHistoryTable.id, id), eq(searchHistoryTable.userId, userId)));

  res.json({ message: "History item deleted" });
});

// ─── Clear All Search History ─────────────────────────────────────────────────
router.delete("/search/history", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  await db.delete(searchHistoryTable).where(eq(searchHistoryTable.userId, userId));

  res.json({ message: "Search history cleared" });
});

export default router;
