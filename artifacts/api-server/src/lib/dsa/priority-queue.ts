/**
 * MinHeap Priority Queue
 * Used for: Revision queue ordering by priority score
 *
 * Time Complexity: Push O(log n), Pop O(log n), Peek O(1)
 * Space Complexity: O(n)
 */

export class MinHeap<T> {
  private heap: Array<{ key: number; value: T }>;

  constructor() {
    this.heap = [];
  }

  /**
   * Insert element with a priority key (lower = higher priority)
   * Time Complexity: O(log n)
   */
  push(key: number, value: T): void {
    this.heap.push({ key, value });
    this.bubbleUp(this.heap.length - 1);
  }

  /**
   * Remove and return the element with lowest key (highest priority)
   * Time Complexity: O(log n)
   */
  pop(): T | undefined {
    if (this.heap.length === 0) return undefined;
    if (this.heap.length === 1) return this.heap.pop()!.value;

    const min = this.heap[0].value;
    this.heap[0] = this.heap.pop()!;
    this.sinkDown(0);
    return min;
  }

  /**
   * Peek at top element without removing
   * Time Complexity: O(1)
   */
  peek(): T | undefined {
    return this.heap[0]?.value;
  }

  get size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /**
   * Return top `n` elements (sorted by priority) without modifying heap
   * Time Complexity: O(n log n)
   */
  topN(n: number): T[] {
    const copy = new MinHeap<T>();
    copy.heap = [...this.heap];
    const results: T[] = [];
    for (let i = 0; i < n && !copy.isEmpty(); i++) {
      results.push(copy.pop()!);
    }
    return results;
  }

  /**
   * Build heap from array — Heapify O(n)
   */
  static from<T>(items: Array<{ key: number; value: T }>): MinHeap<T> {
    const heap = new MinHeap<T>();
    heap.heap = [...items];
    // Start from last non-leaf and sinkDown
    for (let i = Math.floor(heap.heap.length / 2) - 1; i >= 0; i--) {
      heap.sinkDown(i);
    }
    return heap;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.heap[parent].key <= this.heap[index].key) break;
      [this.heap[parent], this.heap[index]] = [
        this.heap[index],
        this.heap[parent],
      ];
      index = parent;
    }
  }

  private sinkDown(index: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < n && this.heap[left].key < this.heap[smallest].key) {
        smallest = left;
      }
      if (right < n && this.heap[right].key < this.heap[smallest].key) {
        smallest = right;
      }

      if (smallest === index) break;

      [this.heap[smallest], this.heap[index]] = [
        this.heap[index],
        this.heap[smallest],
      ];
      index = smallest;
    }
  }
}
