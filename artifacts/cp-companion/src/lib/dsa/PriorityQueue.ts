/**
 * MinHeap Priority Queue — client-side
 * Used for: rendering problems ordered by priority score in the Revision page
 *
 * Time Complexity: push O(log n), pop O(log n), peek O(1)
 * Space Complexity: O(n)
 */
export class MinHeap<T> {
  private heap: Array<{ key: number; value: T }> = [];

  push(key: number, value: T): void {
    this.heap.push({ key, value });
    this.up(this.heap.length - 1);
  }

  pop(): T | undefined {
    if (!this.heap.length) return undefined;
    if (this.heap.length === 1) return this.heap.pop()!.value;
    const top = this.heap[0].value;
    this.heap[0] = this.heap.pop()!;
    this.down(0);
    return top;
  }

  peek(): T | undefined {
    return this.heap[0]?.value;
  }

  get size() {
    return this.heap.length;
  }

  toSortedArray(): T[] {
    const copy = new MinHeap<T>();
    copy.heap = [...this.heap];
    const result: T[] = [];
    while (!copy.isEmpty()) result.push(copy.pop()!);
    return result;
  }

  isEmpty() {
    return this.heap.length === 0;
  }

  private up(i: number) {
    while (i > 0) {
      const p = Math.floor((i - 1) / 2);
      if (this.heap[p].key <= this.heap[i].key) break;
      [this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]];
      i = p;
    }
  }

  private down(i: number) {
    const n = this.heap.length;
    while (true) {
      let sm = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.heap[l].key < this.heap[sm].key) sm = l;
      if (r < n && this.heap[r].key < this.heap[sm].key) sm = r;
      if (sm === i) break;
      [this.heap[sm], this.heap[i]] = [this.heap[i], this.heap[sm]];
      i = sm;
    }
  }
}
