/**
 * Centralized API Configuration
 *
 * Single source of truth for resolving the backend API root URL.
 * Handles production normalization, development fallbacks, and
 * prevents duplicate trailing slashes or duplicate /api suffixes.
 */

function normalizeApiUrl(raw: string): string {
  if (!raw) return "";
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  // If a bare hostname is provided in production (e.g. from Render host URL), default to https://
  return `https://${trimmed}`;
}

export function resolveApiRoot(): string {
  const envUrl = import.meta.env.VITE_API_URL;

  if (envUrl && typeof envUrl === "string" && envUrl.trim().length > 0) {
    const normalized = normalizeApiUrl(envUrl);
    return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
  }

  // In local development, fall back to local backend port 4000
  if (import.meta.env.DEV) {
    return "http://localhost:4000/api";
  }

  // In production without explicit VITE_API_URL, use relative /api (e.g. reverse proxy / same origin)
  return "/api";
}

export const API_ROOT = resolveApiRoot();
