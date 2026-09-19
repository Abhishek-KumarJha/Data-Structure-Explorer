import jwt from "jsonwebtoken";

const isProduction = process.env.NODE_ENV === "production";

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim().length === 0)) {
  throw new Error("CRITICAL CONFIGURATION ERROR: JWT_SECRET environment variable is mandatory in production.");
}

const JWT_SECRET = process.env.JWT_SECRET ?? "cp-companion-dev-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";

export interface JwtPayload {
  userId: number;
  email: string;
  name: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}
