import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, problemsTable, importExportHistoryTable, usersTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { z } from "zod/v4";

const router: IRouter = Router();

// ─── Export JSON ──────────────────────────────────────────────────────────────
router.get("/export/json", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const problems = await db
    .select()
    .from(problemsTable)
    .where(eq(problemsTable.userId, userId));

  // Log export
  await db.insert(importExportHistoryTable).values({
    userId,
    type: "export",
    format: "json",
    filename: `cp-companion-export-${new Date().toISOString().slice(0, 10)}.json`,
    recordCount: problems.length,
    status: "success",
  });

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="cp-companion-export-${new Date().toISOString().slice(0, 10)}.json"`,
  );
  res.json(
    problems.map((p: any) => ({
      title: p.title,
      difficulty: p.difficulty,
      platform: p.platform,
      topics: p.topics,
      companyTags: p.companyTags,
      status: p.status,
      favorite: p.favorite,
      bookmark: p.bookmark,
      notes: p.notes,
      solutionLink: p.solutionLink,
      dateAdded: p.dateAdded,
      solvedDate: p.solvedDate,
      attempts: p.attempts,
    })),
  );
});

// ─── Export CSV ───────────────────────────────────────────────────────────────
router.get("/export/csv", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const problems = await db
    .select()
    .from(problemsTable)
    .where(eq(problemsTable.userId, userId));

  const headers = [
    "title", "difficulty", "platform", "topics", "companyTags",
    "status", "favorite", "bookmark", "notes", "solutionLink",
    "dateAdded", "solvedDate", "attempts",
  ];

  const escapeCell = (val: unknown): string => {
    const str =
      Array.isArray(val)
        ? val.join("|")
        : String(val ?? "");
    return `"${str.replaceAll('"', '""')}"`;
  };

  const rows = problems.map((p: any) =>
    headers.map((h) => escapeCell(p[h as keyof typeof p])).join(","),
  );

  const csv = [headers.join(","), ...rows].join("\n");

  // Log export
  await db.insert(importExportHistoryTable).values({
    userId,
    type: "export",
    format: "csv",
    filename: `cp-companion-export-${new Date().toISOString().slice(0, 10)}.csv`,
    recordCount: problems.length,
    status: "success",
  });

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="cp-companion-export-${new Date().toISOString().slice(0, 10)}.csv"`,
  );
  res.send(csv);
});

// ─── Import JSON ──────────────────────────────────────────────────────────────
const ImportJsonBody = z.object({
  problems: z.array(
    z.object({
      title: z.string().min(1).max(300),
      difficulty: z.enum(["Easy", "Medium", "Hard"]),
      platform: z.string().min(1).max(100),
      topics: z.array(z.string()).default([]),
      companyTags: z.array(z.string()).default([]),
      status: z.enum(["Solved", "Unsolved"]).default("Unsolved"),
      favorite: z.boolean().default(false),
      bookmark: z.boolean().default(false),
      notes: z.string().default(""),
      solutionLink: z.string().default(""),
      dateAdded: z.string().optional(),
      solvedDate: z.string().nullable().optional(),
      attempts: z.number().int().min(0).default(0),
    }),
  ),
  mode: z.enum(["append", "replace"]).default("append"),
});

router.post("/import/json", requireAuth, async (req, res): Promise<void> => {
  const parsed = ImportJsonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.user!.userId;
  const { problems, mode } = parsed.data;
  const today = new Date().toISOString().slice(0, 10);

  // Duplicate detection: fetch existing titles
  const existing = await db
    .select({ title: problemsTable.title })
    .from(problemsTable)
    .where(eq(problemsTable.userId, userId));

  const existingTitles = new Set(existing.map((e: any) => e.title.toLowerCase()));

  // Filter duplicates
  const newProblems = problems.filter(
    (p) => !existingTitles.has(p.title.toLowerCase()),
  );
  const duplicatesSkipped = problems.length - newProblems.length;

  if (mode === "replace") {
    // Delete all existing problems for this user
    await db.delete(problemsTable).where(eq(problemsTable.userId, userId));
    // Re-insert everything
    const rows = problems.map((p) => ({
      userId,
      ...p,
      dateAdded: p.dateAdded ?? today,
      solvedDate: p.solvedDate ?? null,
    }));
    if (rows.length > 0) {
      await db.insert(problemsTable).values(rows);
    }
  } else {
    // Append mode: only insert non-duplicates
    if (newProblems.length > 0) {
      const rows = newProblems.map((p) => ({
        userId,
        ...p,
        dateAdded: p.dateAdded ?? today,
        solvedDate: p.solvedDate ?? null,
      }));
      await db.insert(problemsTable).values(rows);
    }
  }

  const importedCount = mode === "replace" ? problems.length : newProblems.length;

  await db.insert(importExportHistoryTable).values({
    userId,
    type: "import",
    format: "json",
    filename: "import.json",
    recordCount: importedCount,
    status: "success",
  });

  res.json({
    imported: importedCount,
    duplicatesSkipped,
    total: problems.length,
    mode,
  });
});

// ─── Import CSV ───────────────────────────────────────────────────────────────
router.post("/import/csv", requireAuth, async (req, res): Promise<void> => {
  const { csv, mode = "append" } = req.body as { csv: string; mode?: string };

  if (!csv || typeof csv !== "string") {
    res.status(400).json({ error: "CSV content is required" });
    return;
  }

  const userId = req.user!.userId;
  const today = new Date().toISOString().slice(0, 10);
  const importMode = mode === "replace" ? "replace" : "append";

  // Parse CSV
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) {
    res.status(400).json({ error: "CSV must have at least a header and one row" });
    return;
  }

  const headers = lines[0].split(",").map((h) => h.replaceAll('"', "").trim());

  const parseRow = (line: string): Record<string, string> => {
    const values = line.match(/(".*?"|[^",]+)(?=,|$)/g) ?? [];
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (values[i] ?? "").replace(/^"|"$/g, "").replaceAll('""', '"');
    });
    return row;
  };

  const rawRows = lines.slice(1).map(parseRow);

  // Validate and transform
  const problems = rawRows
    .filter((r) => r.title?.trim())
    .map((r) => ({
      title: r.title.trim(),
      difficulty: (["Easy", "Medium", "Hard"].includes(r.difficulty)
        ? r.difficulty
        : "Medium") as "Easy" | "Medium" | "Hard",
      platform: r.platform?.trim() || "LeetCode",
      topics: r.topics ? r.topics.split("|").filter(Boolean) : [],
      companyTags: r.companyTags ? r.companyTags.split("|").filter(Boolean) : [],
      status: (r.status === "Solved" ? "Solved" : "Unsolved") as "Solved" | "Unsolved",
      favorite: r.favorite === "true",
      bookmark: r.bookmark === "true",
      notes: r.notes ?? "",
      solutionLink: r.solutionLink ?? "",
      dateAdded: r.dateAdded || today,
      solvedDate: r.solvedDate || null,
      attempts: parseInt(r.attempts ?? "0", 10) || 0,
      userId,
    }));

  if (problems.length === 0) {
    res.status(400).json({ error: "No valid problems found in CSV" });
    return;
  }

  // Duplicate detection
  const existing = await db
    .select({ title: problemsTable.title })
    .from(problemsTable)
    .where(eq(problemsTable.userId, userId));

  const existingTitles = new Set(existing.map((e: any) => e.title.toLowerCase()));

  let importedCount = 0;
  let duplicatesSkipped = 0;

  if (importMode === "replace") {
    await db.delete(problemsTable).where(eq(problemsTable.userId, userId));
    await db.insert(problemsTable).values(problems);
    importedCount = problems.length;
  } else {
    const newProblems = problems.filter(
      (p) => !existingTitles.has(p.title.toLowerCase()),
    );
    duplicatesSkipped = problems.length - newProblems.length;
    if (newProblems.length > 0) {
      await db.insert(problemsTable).values(newProblems);
    }
    importedCount = newProblems.length;
  }

  await db.insert(importExportHistoryTable).values({
    userId,
    type: "import",
    format: "csv",
    filename: "import.csv",
    recordCount: importedCount,
    status: "success",
  });

  res.json({ imported: importedCount, duplicatesSkipped, total: problems.length, mode: importMode });
});

// ─── Import/Export History ────────────────────────────────────────────────────
router.get("/import-export/history", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.userId;

  const history = await db
    .select()
    .from(importExportHistoryTable)
    .where(eq(importExportHistoryTable.userId, userId))
    .orderBy(desc(importExportHistoryTable.createdAt))
    .limit(20);

  res.json(history);
});

export default router;
