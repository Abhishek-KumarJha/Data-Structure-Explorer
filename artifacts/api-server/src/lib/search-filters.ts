import { eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { problemsTable } from "@workspace/db";

export interface ProblemFilterParams {
  userId: number;
  search?: string;
  difficulty?: "Easy" | "Medium" | "Hard" | "All" | string;
  platform?: string;
  status?: "Solved" | "Unsolved" | "All" | string;
  favoritesOnly?: boolean;
  bookmarksOnly?: boolean;
  topic?: string;
  company?: string;
}

export function sanitizeSearchQuery(query?: string): string {
  if (!query) return "";
  // Trim and cap at 200 characters to prevent ReDoS / excessive queries
  return query.trim().slice(0, 200);
}

export function buildProblemSearchFilters(params: ProblemFilterParams): SQL[] {
  const {
    userId,
    search,
    difficulty,
    platform,
    status,
    favoritesOnly,
    bookmarksOnly,
    topic,
    company,
  } = params;

  const filters: SQL[] = [eq(problemsTable.userId, userId)];

  const cleanSearch = sanitizeSearchQuery(search);
  if (cleanSearch) {
    const pattern = `%${cleanSearch}%`;
    const searchFilter = or(
      ilike(problemsTable.title, pattern),
      ilike(problemsTable.platform, pattern),
      sql`${problemsTable.topics}::text ilike ${pattern}`,
      sql`${problemsTable.companyTags}::text ilike ${pattern}`,
    );
    if (searchFilter) {
      filters.push(searchFilter);
    }
  }

  if (difficulty && difficulty !== "All") {
    filters.push(eq(problemsTable.difficulty, difficulty));
  }

  if (platform) {
    filters.push(ilike(problemsTable.platform, `%${platform.trim()}%`));
  }

  if (status && status !== "All") {
    filters.push(eq(problemsTable.status, status));
  }

  if (favoritesOnly) {
    filters.push(eq(problemsTable.favorite, true));
  }

  if (bookmarksOnly) {
    filters.push(eq(problemsTable.bookmark, true));
  }

  if (topic) {
    const cleanTopic = sanitizeSearchQuery(topic);
    if (cleanTopic) {
      filters.push(sql`${problemsTable.topics}::text ilike ${"%" + cleanTopic + "%"}`);
    }
  }

  if (company) {
    const cleanCompany = sanitizeSearchQuery(company);
    if (cleanCompany) {
      filters.push(sql`${problemsTable.companyTags}::text ilike ${"%" + cleanCompany + "%"}`);
    }
  }

  return filters;
}
