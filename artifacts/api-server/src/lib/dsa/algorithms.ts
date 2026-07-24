/**
 * SM-2 Spaced Repetition Algorithm
 * Based on: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 *
 * Used for: Intelligent revision queue scheduling
 * The algorithm adjusts review intervals based on performance quality (0-5)
 *
 * Time Complexity: O(1) per review calculation
 * Space Complexity: O(1)
 */

export interface SM2Input {
  easeFactor: number;   // starts at 2.5, range [1.3, ∞)
  interval: number;      // days until next review
  repetitions: number;   // number of successful reviews
}

export interface SM2Output {
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: Date;
}

/**
 * Calculate next review parameters using SM-2 algorithm
 *
 * @param current - Current SM-2 state for the item
 * @param quality - Performance rating 0-5 (0=blackout, 5=perfect)
 *   0 = complete blackout
 *   1 = incorrect, correct answer was easy to recall
 *   2 = incorrect, correct answer seemed easy when shown
 *   3 = correct, but required significant difficulty
 *   4 = correct after hesitation
 *   5 = perfect response
 */
export function sm2Calculate(current: SM2Input, quality: number): SM2Output {
  // Clamp quality to [0, 5]
  const q = Math.max(0, Math.min(5, quality));

  let { easeFactor, interval, repetitions } = current;

  if (q >= 3) {
    // Successful review
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  } else {
    // Failed review — reset repetitions but keep ease factor
    repetitions = 0;
    interval = 1;
  }

  // Update ease factor: EF' = EF + (0.1 − (5−q) × (0.08 + (5−q) × 0.02))
  easeFactor = easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));

  // Ensure ease factor never drops below 1.3
  easeFactor = Math.max(1.3, easeFactor);

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + interval);

  return { easeFactor, interval, repetitions, nextReviewAt };
}

/**
 * Compute a priority score for a revision queue item.
 * Lower score = higher priority (used with MinHeap)
 *
 * Factors:
 * - How overdue the item is (negative = past due)
 * - Number of attempts (more attempts = harder problem)
 * - Difficulty weight
 * - User-set priority
 *
 * Time Complexity: O(1)
 */
export function computeRevisionPriority(params: {
  nextReviewAt: Date;
  attempts: number;
  difficulty: string;
  priority: number;
  repetitions: number;
}): number {
  const now = Date.now();
  const daysUntilReview =
    (params.nextReviewAt.getTime() - now) / (1000 * 60 * 60 * 24);

  const difficultyWeight =
    params.difficulty === "Hard" ? 3 : params.difficulty === "Medium" ? 2 : 1;

  // Score: overdue items get negative scores (highest priority)
  // Hard problems with many attempts get higher urgency
  const score =
    daysUntilReview * 10 -
    params.attempts * difficultyWeight -
    (10 - params.priority) * 5 -
    params.repetitions * 2;

  return score;
}

/**
 * Binary Search — find a problem by ID in sorted array
 * Time Complexity: O(log n)
 * Space Complexity: O(1)
 */
export function binarySearch<T extends { id: number }>(
  sortedArr: T[],
  targetId: number,
): T | null {
  let lo = 0;
  let hi = sortedArr.length - 1;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (sortedArr[mid].id === targetId) return sortedArr[mid];
    if (sortedArr[mid].id < targetId) lo = mid + 1;
    else hi = mid - 1;
  }

  return null;
}

/**
 * Prefix Sum — for heatmap computation
 * Builds prefix sum array in O(n), then answers range queries in O(1)
 *
 * Time Complexity: Build O(n), Query O(1)
 * Space Complexity: O(n)
 */
export class PrefixSum {
  private prefix: number[];

  constructor(arr: number[]) {
    this.prefix = new Array(arr.length + 1).fill(0);
    for (let i = 0; i < arr.length; i++) {
      this.prefix[i + 1] = this.prefix[i] + arr[i];
    }
  }

  /** Sum of elements from index l to r (inclusive), O(1) */
  rangeSum(l: number, r: number): number {
    return this.prefix[r + 1] - this.prefix[l];
  }

  get total(): number {
    return this.prefix[this.prefix.length - 1];
  }
}

/**
 * Greedy algorithm for contest problem selection
 * Selects `count` problems with balanced difficulty distribution
 * Strategy: maximize difficulty diversity, prefer unsolved problems
 *
 * Time Complexity: O(n log n) for sorting
 * Space Complexity: O(n)
 */
export function greedyContestSelection<
  T extends { difficulty: string; status: string; id: number },
>(problems: T[], count: number): T[] {
  // Prefer unsolved, then sort by difficulty ASC (Easy → Hard for warm-up)
  const difficultyOrder: Record<string, number> = {
    Easy: 1,
    Medium: 2,
    Hard: 3,
  };

  const sorted = [...problems].sort((a, b) => {
    // Prioritize unsolved
    if (a.status !== b.status) {
      return a.status === "Unsolved" ? -1 : 1;
    }
    // Then by difficulty
    return (
      (difficultyOrder[a.difficulty] ?? 2) -
      (difficultyOrder[b.difficulty] ?? 2)
    );
  });

  // Greedy: pick problems to ensure at least 1 Easy, then fill with Medium/Hard
  const selected: T[] = [];
  const buckets: Record<string, T[]> = { Easy: [], Medium: [], Hard: [] };

  for (const p of sorted) {
    if (buckets[p.difficulty]) {
      buckets[p.difficulty].push(p);
    }
  }

  // Ensure balanced distribution
  const distribution =
    count <= 3
      ? { Easy: 1, Medium: count - 1, Hard: 0 }
      : { Easy: 1, Medium: Math.ceil((count - 2) / 2), Hard: Math.floor((count - 2) / 2) + 1 };

  for (const [diff, want] of Object.entries(distribution)) {
    const pool = buckets[diff] ?? [];
    selected.push(...pool.slice(0, want));
  }

  // If not enough from distribution, fill with any remaining
  const selectedIds = new Set(selected.map((p) => p.id));
  for (const p of sorted) {
    if (selected.length >= count) break;
    if (!selectedIds.has(p.id)) {
      selected.push(p);
      selectedIds.add(p.id);
    }
  }

  return selected.slice(0, count);
}
