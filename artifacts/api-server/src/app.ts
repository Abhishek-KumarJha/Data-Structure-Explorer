import crypto from "node:crypto";
import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { AppError } from "./lib/errors.js";
import { authRateLimiter, generalRateLimiter } from "./middlewares/rate-limit.js";

const app: Express = express();
const isProduction = process.env.NODE_ENV === "production";

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

const configuredOrigins = [
  ...buildAllowedOrigins(process.env.CLIENT_ORIGIN),
  ...buildAllowedOrigins(process.env.ADDITIONAL_CLIENT_ORIGINS),
];

const defaultDevOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
];

const allowedOrigins = isProduction
  ? configuredOrigins
  : [...new Set([...configuredOrigins, ...defaultDevOrigins])];

// ─── Security & Platform Settings ─────────────────────────────────────────────
app.disable("x-powered-by");
app.set("trust proxy", 1);

// ─── Request Correlation ID Middleware ─────────────────────────────────────────
app.use((req, res, next) => {
  const reqId =
    (req.headers["x-request-id"] as string) || crypto.randomUUID();
  req.id = reqId;
  res.setHeader("X-Request-Id", reqId);
  next();
});

// ─── Standard Security Headers ────────────────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

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

// ─── Fail-Safe CORS Configuration ─────────────────────────────────────────────
app.use(
  cors({
    origin(origin, callback) {
      // Non-browser or same-origin requests
      if (!origin) {
        callback(null, true);
        return;
      }

      // If in production without configured origins, reject cross-origin requests
      if (isProduction && allowedOrigins.length === 0) {
        callback(new Error("CORS rejected: CLIENT_ORIGIN not configured in production"), false);
        return;
      }

      // In development with no configured origins, allow all
      if (allowedOrigins.length === 0) {
        callback(null, true);
        return;
      }

      const requestOrigin = normalizeOrigin(origin);
      const isAllowed = allowedOrigins.includes(requestOrigin);
      callback(isAllowed ? null : new Error(`Not allowed by CORS: ${origin}`), isAllowed);
    },
    credentials: true, // allow httpOnly cookies
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  }),
);

// ─── Parsers ──────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" })); // allow larger CSV/JSON imports
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ─── Root Probe ───────────────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    service: "cp-companion-api",
    status: "ok",
    health: "/api/healthz",
    ready: "/api/readyz",
  });
});

// ─── Rate Limiting & Routes ───────────────────────────────────────────────────
app.use("/api/auth", authRateLimiter);
app.use("/api", generalRateLimiter);
app.use("/api", router);

// ─── Centralized Error Handler ────────────────────────────────────────────────
app.use(
  (
    err: Error | AppError,
    req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    logger.error({ err, reqId: req.id }, "Request error");

    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
          fields: err.fields,
        },
        requestId: req.id,
      });
      return;
    }

    // CORS error response
    if (err.message && err.message.includes("CORS")) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: err.message,
        },
        requestId: req.id,
      });
      return;
    }

    // Generic unhandled internal error (safe public message, no sensitive leaks)
    res.status(500).json({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
      requestId: req.id,
    });
  },
);

export default app;
