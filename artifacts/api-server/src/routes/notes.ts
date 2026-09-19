import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, notesTable, problemsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";
import { z } from "zod/v4";

const router: IRouter = Router();

const NoteBody = z.object({
  content: z.string().max(10000),
});

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] ?? "";
  return param ?? "";
}

// ─── Get Note ─────────────────────────────────────────────────────────────────
router.get("/notes/:problemId", requireAuth, async (req, res): Promise<void> => {
  const problemId = parseInt(getParam(req.params.problemId), 10);
  if (isNaN(problemId)) {
    res.status(400).json({ error: "Invalid problem id" });
    return;
  }

  const userId = req.user!.userId;

  // Verify problem ownership
  const [problem] = await db
    .select({ id: problemsTable.id })
    .from(problemsTable)
    .where(and(eq(problemsTable.id, problemId), eq(problemsTable.userId, userId)))
    .limit(1);

  if (!problem) {
    res.status(404).json({ error: "Problem not found" });
    return;
  }

  const [note] = await db
    .select()
    .from(notesTable)
    .where(and(eq(notesTable.userId, userId), eq(notesTable.problemId, problemId)))
    .limit(1);

  res.json(note ?? { content: "", problemId, userId });
});

// ─── Upsert Note ──────────────────────────────────────────────────────────────
router.put("/notes/:problemId", requireAuth, async (req, res): Promise<void> => {
  const problemId = parseInt(getParam(req.params.problemId), 10);
  if (isNaN(problemId)) {
    res.status(400).json({ error: "Invalid problem id" });
    return;
  }

  const parsed = NoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const userId = req.user!.userId;

  // Verify problem ownership
  const [problem] = await db
    .select({ id: problemsTable.id })
    .from(problemsTable)
    .where(and(eq(problemsTable.id, problemId), eq(problemsTable.userId, userId)))
    .limit(1);

  if (!problem) {
    res.status(404).json({ error: "Problem not found" });
    return;
  }

  const note = await db.transaction(async (tx: any) => {
    const [n] = await tx
      .insert(notesTable)
      .values({ userId, problemId, content: parsed.data.content })
      .onConflictDoUpdate({
        target: [notesTable.userId, notesTable.problemId],
        set: { content: parsed.data.content, updatedAt: new Date() },
      })
      .returning();

    // Also sync to problems.notes field for quick access atomically
    await tx
      .update(problemsTable)
      .set({ notes: parsed.data.content })
      .where(and(eq(problemsTable.id, problemId), eq(problemsTable.userId, userId)));

    return n;
  });

  res.json(note);
});

// ─── Delete Note ──────────────────────────────────────────────────────────────
router.delete("/notes/:problemId", requireAuth, async (req, res): Promise<void> => {
  const problemId = parseInt(getParam(req.params.problemId), 10);
  if (isNaN(problemId)) {
    res.status(400).json({ error: "Invalid problem id" });
    return;
  }

  const userId = req.user!.userId;

  await db.transaction(async (tx: any) => {
    await tx
      .delete(notesTable)
      .where(and(eq(notesTable.userId, userId), eq(notesTable.problemId, problemId)));

    await tx
      .update(problemsTable)
      .set({ notes: "" })
      .where(and(eq(problemsTable.id, problemId), eq(problemsTable.userId, userId)));
  });

  res.json({ message: "Note deleted" });
});

export default router;
