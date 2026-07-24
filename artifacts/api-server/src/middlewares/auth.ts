import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../lib/jwt.js";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Middleware: Require authenticated JWT
 * Checks Authorization header (Bearer token) OR cp-token cookie
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // Try Authorization header first
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (req.cookies?.["cp-token"]) {
    // Fallback to httpOnly cookie
    token = req.cookies["cp-token"] as string;
  }

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  req.user = payload;
  next();
}

/**
 * Optional auth — sets req.user if valid token, but doesn't block
 */
export function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else if (req.cookies?.["cp-token"]) {
    token = req.cookies["cp-token"] as string;
  }

  if (token) {
    const payload = verifyToken(token);
    if (payload) req.user = payload;
  }

  next();
}
