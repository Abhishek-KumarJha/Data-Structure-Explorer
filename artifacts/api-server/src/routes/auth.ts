import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, userStatisticsTable } from "@workspace/db";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middlewares/auth.js";
import { z } from "zod/v4";

const router: IRouter = Router();
const SALT_ROUNDS = 12;

// ─── Schemas ──────────────────────────────────────────────────────────────────
const RegisterBody = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const UpdateProfileBody = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().optional(),
  weeklyGoal: z.number().int().min(1).max(100).optional(),
  theme: z.enum(["light", "dark"]).optional(),
});

// ─── Register ─────────────────────────────────────────────────────────────────
router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { name, email, password } = parsed.data;

  // Check if email already exists
  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const [user] = await db
    .insert(usersTable)
    .values({ name, email: email.toLowerCase(), passwordHash })
    .returning();

  // Initialize statistics row for new user
  await db.insert(userStatisticsTable).values({ userId: user.id });

  const token = signToken({ userId: user.id, email: user.email, name: user.name });

  res.cookie("cp-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email, weeklyGoal: user.weeklyGoal, theme: user.theme },
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────
router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email, name: user.name });

  res.cookie("cp-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, weeklyGoal: user.weeklyGoal, theme: user.theme },
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────
router.post("/auth/logout", (_req, res): void => {
  res.clearCookie("cp-token");
  res.json({ message: "Logged out" });
});

// ─── Me ───────────────────────────────────────────────────────────────────────
router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.user!.userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    weeklyGoal: user.weeklyGoal,
    theme: user.theme,
    createdAt: user.createdAt,
  });
});

// ─── Update Profile ───────────────────────────────────────────────────────────
router.put("/auth/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.name) update.name = parsed.data.name;
  if (parsed.data.email) update.email = parsed.data.email.toLowerCase();
  if (parsed.data.weeklyGoal !== undefined) update.weeklyGoal = parsed.data.weeklyGoal;
  if (parsed.data.theme) update.theme = parsed.data.theme;

  const [user] = await db
    .update(usersTable)
    .set(update)
    .where(eq(usersTable.id, req.user!.userId))
    .returning();

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    weeklyGoal: user.weeklyGoal,
    theme: user.theme,
  });
});

export default router;
