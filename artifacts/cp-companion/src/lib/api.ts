import { getStoredToken } from '../hooks/use-auth';

const BASE = import.meta.env.VITE_API_URL ?? '';

export type ApiError = { message: string; status: number };

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers ?? {}),
  };

  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      message = err.error ?? err.message ?? message;
    } catch {}
    const error = new Error(message) as Error & { status: number };
    error.status = res.status;
    throw error;
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Typed API helpers ────────────────────────────────────────────────────────
export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};

// ─── Problem types ────────────────────────────────────────────────────────────
export interface Problem {
  id: number;
  userId: number;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  platform: string;
  topics: string[];
  companyTags: string[];
  status: 'Solved' | 'Unsolved';
  favorite: boolean;
  bookmark: boolean;
  notes: string;
  solutionLink: string;
  dateAdded: string;
  solvedDate: string | null;
  attempts: number;
  lastRevisedAt: string | null;
  revisionCount: number;
}

export interface ProblemsResponse {
  problems: Problem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AnalyticsSummary {
  total: number;
  solved: number;
  favorites: number;
  bookmarks: number;
  successRate: number;
  weeklyGoal: number;
  weeklyCompleted: number;
  currentStreak: number;
  longestStreak: number;
  difficulty: Array<{ name: string; value: number }>;
  topics: Array<{ name: string; value: number }>;
  platforms: Array<{ name: string; value: number }>;
  weeklyActivity: Array<{ day: string; solved: number }>;
}

export interface HeatmapData {
  heatmap: Array<{ date: string; count: number }>;
  totalSolvedYear: number;
  lastWeek: number;
  lastMonth: number;
}

export interface RevisionQueueItem extends Problem {
  queueId: number;
  nextReviewAt: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  priority: number;
  isDue: boolean;
}

export interface RevisionQueueResponse {
  queue: RevisionQueueItem[];
  stats: { dueToday: number; reviewRhythm: number; retention: number };
}

export interface Contest {
  id: number;
  userId: number;
  name: string;
  type: string;
  durationMinutes: number;
  status: string;
  score: number;
  startedAt: string;
  completedAt: string | null;
  endsAt: string;
  problems?: ContestProblem[];
  timeRemaining?: number;
  totalProblems?: number;
  solvedCount?: number;
}

export interface ContestProblem extends Problem {
  label: string;
  solved: boolean;
  submittedAt: string | null;
  timeTakenSeconds: number | null;
}

export interface SearchResult {
  results: Problem[];
  total: number;
  query: string;
}

export interface SearchHistoryItem {
  id: number;
  query: string;
  searchedAt: string;
  resultCount: number;
}

export interface Note {
  id?: number;
  userId: number;
  problemId: number;
  content: string;
  updatedAt?: string;
}

export interface ImportExportHistoryItem {
  id: number;
  type: string;
  format: string;
  filename: string;
  recordCount: number;
  status: string;
  createdAt: string;
}
