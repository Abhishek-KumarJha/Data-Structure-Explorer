import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// Liveness probe: confirms the process is alive and accepting traffic
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Readiness probe: verifies database connectivity before serving traffic
router.get("/readyz", async (_req, res) => {
  try {
    await db.execute(sql`SELECT 1`);
    res.json({ status: "ok", database: "connected" });
  } catch (error) {
    res.status(503).json({
      status: "error",
      database: "disconnected",
      message: "Database service unavailable",
    });
  }
});

export default router;
