/**
 * Centralized React Query Key Factory
 *
 * Provides typed, consistent query key arrays across all frontend
 * queries and mutations. Enables predictable partial cache invalidation.
 */

export const queryKeys = {
  auth: {
    me: () => ["auth", "me"] as const,
  },
  problems: {
    all: () => ["problems"] as const,
    list: (params?: string | Record<string, unknown>) =>
      ["problems", "list", params ?? ""] as const,
    recent: () => ["problems", "recent"] as const,
    detail: (id: number) => ["problems", "detail", id] as const,
    forTrie: () => ["problems", "forTrie"] as const,
  },
  analytics: {
    all: () => ["analytics"] as const,
    summary: () => ["analytics", "summary"] as const,
  },
  revision: {
    all: () => ["revision"] as const,
    queue: (limit?: number) => ["revision", "queue", limit ?? 20] as const,
    stats: () => ["revision", "stats"] as const,
  },
  contests: {
    all: () => ["contests"] as const,
    active: () => ["contests", "active"] as const,
    list: (page?: number) => ["contests", "list", page ?? 1] as const,
    detail: (id: number) => ["contests", "detail", id] as const,
    stats: () => ["contests", "stats"] as const,
  },
  notes: {
    detail: (problemId: number) => ["notes", problemId] as const,
  },
  search: {
    history: () => ["search", "history"] as const,
    autocomplete: (query: string) => ["search", "autocomplete", query] as const,
  },
  settings: () => ["settings"] as const,
};
