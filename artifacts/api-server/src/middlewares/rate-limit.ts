import type { Request, Response, NextFunction } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

interface ClientRecord {
  timestamps: number[];
}

/**
 * In-memory sliding-window rate limiter middleware.
 * Zero external dependencies; safe for bundling with esbuild.
 */
export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, message = "Too many requests. Please try again later." } = options;
  const clients = new Map<string, ClientRecord>();

  // Cleanup expired entries periodically (every 5 minutes)
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of clients.entries()) {
      record.timestamps = record.timestamps.filter((t) => now - t < windowMs);
      if (record.timestamps.length === 0) {
        clients.delete(ip);
      }
    }
  }, 5 * 60 * 1000).unref();

  return (req: Request, res: Response, next: NextFunction): void => {
    // In test or benchmark environments, bypass rate limiting if explicitly disabled
    if (process.env.DISABLE_RATE_LIMIT === "true") {
      next();
      return;
    }

    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown-client";

    const now = Date.now();
    let record = clients.get(ip);

    if (!record) {
      record = { timestamps: [] };
      clients.set(ip, record);
    }

    // Filter to timestamps within current window
    record.timestamps = record.timestamps.filter((t) => now - t < windowMs);

    if (record.timestamps.length >= max) {
      const oldest = record.timestamps[0];
      const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
      res.setHeader("Retry-After", String(Math.max(1, retryAfterSec)));
      res.status(429).json({
        error: {
          code: "RATE_LIMITED",
          message,
        },
      });
      return;
    }

    record.timestamps.push(now);
    next();
  };
}

// Strict limiter for authentication endpoints (login, register)
export const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // 10 attempts per minute
  message: "Too many authentication attempts. Please wait a minute and try again.",
});

// General limiter for public API endpoints
export const generalRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 150,            // 150 requests per minute
  message: "API rate limit exceeded. Please slow down.",
});
