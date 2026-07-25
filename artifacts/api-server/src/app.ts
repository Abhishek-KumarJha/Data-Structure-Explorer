import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, "");
}

function buildAllowedOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((entry) => normalizeOrigin(entry))
    .filter((entry) => entry.length > 0);
}

const allowedOrigins = [
  ...buildAllowedOrigins(process.env.CLIENT_ORIGIN),
  ...buildAllowedOrigins(process.env.ADDITIONAL_CLIENT_ORIGINS),
];

// ─── Security Headers ─────────────────────────────────────────────────────────
app.disable("x-powered-by");
app.set("trust proxy", 1);

// ─── Logging ──────────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin(origin, callback) {
      // Non-browser requests and same-origin requests may not send Origin.
      if (!origin) {
        callback(null, true);
        return;
      }

      // If no explicit allow-list is configured, allow all origins.
      if (allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }

      const requestOrigin = normalizeOrigin(origin);
      const isAllowed = allowedOrigins.includes(requestOrigin);
      callback(isAllowed ? null : new Error("Not allowed by CORS"), isAllowed);
    },
    credentials: true, // allow cookies
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ─── Parsers ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" })); // allow larger CSV/JSON imports
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Root probe for quick platform connectivity checks.
app.get("/", (_req, res) => {
  res.json({
    service: "cp-companion-api",
    status: "ok",
    health: "/api/healthz",
  });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error(err);
    res.status(500).json({ error: "Internal server error" });
  },
);

export default app;
