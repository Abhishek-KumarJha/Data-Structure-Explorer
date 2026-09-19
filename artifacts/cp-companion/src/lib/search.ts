/**
 * CP Companion Search Helpers
 * Centralized query construction, URL synchronization, and text highlighting.
 */

export interface HighlightSegment {
  text: string;
  highlight: boolean;
}

/**
 * Splits text into segments indicating whether they match the query substring.
 * Safe against regex special characters.
 */
export function highlightMatch(text: string, query: string): HighlightSegment[] {
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    return [{ text, highlight: false }];
  }

  // Escape regex special characters
  const escaped = cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  const parts = text.split(regex);

  if (parts.length <= 1) {
    return [{ text, highlight: false }];
  }

  return parts
    .filter((part) => part.length > 0)
    .map((part) => ({
      text: part,
      highlight: part.toLowerCase() === cleanQuery.toLowerCase(),
    }));
}

/**
 * Builds a clean URL query string from params object, stripping empty / undefined values.
 */
export function buildSearchQuery(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== "" && val !== false) {
      searchParams.set(key, String(val));
    }
  }

  const res = searchParams.toString();
  return res ? `?${res}` : "";
}

/**
 * Parses search query string into a key-value record.
 */
export function parseSearchQuery(searchString: string): Record<string, string> {
  const raw = searchString.startsWith("?") ? searchString.slice(1) : searchString;
  const searchParams = new URLSearchParams(raw);
  const result: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    result[key] = value;
  });

  return result;
}
