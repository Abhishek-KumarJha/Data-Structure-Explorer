/**
 * Trie (Prefix Tree) — O(k) insert and search, where k = word length
 *
 * Used for: Search autocomplete suggestions from problem titles
 * Space Complexity: O(n * k) where n = number of words, k = avg word length
 */

interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  word: string; // store the complete word at leaf
  metadata?: { id: number; platform: string; difficulty: string };
}

export interface SearchSuggestion {
  id: number;
  title: string;
  platform: string;
  difficulty: string;
}

export class Trie {
  private root: TrieNode;
  private size: number;

  constructor() {
    this.root = this.createNode();
    this.size = 0;
  }

  private createNode(): TrieNode {
    return { children: new Map(), isEnd: false, word: "" };
  }

  /**
   * Insert a word into the Trie
   * Time Complexity: O(k) where k = word.length
   */
  insert(
    word: string,
    metadata?: { id: number; platform: string; difficulty: string },
  ): void {
    let current = this.root;
    const normalized = word.toLowerCase();

    for (const char of normalized) {
      if (!current.children.has(char)) {
        current.children.set(char, this.createNode());
      }
      current = current.children.get(char)!;
    }

    if (!current.isEnd) {
      this.size++;
    }

    current.isEnd = true;
    current.word = word; // preserve original casing
    if (metadata) {
      current.metadata = metadata;
    }
  }

  /**
   * Search for all words with the given prefix (autocomplete)
   * Time Complexity: O(k + m) where k = prefix length, m = number of results
   * Returns up to `limit` results
   */
  search(prefix: string, limit = 10): SearchSuggestion[] {
    let current = this.root;
    const normalized = prefix.toLowerCase();

    // Navigate to prefix node
    for (const char of normalized) {
      if (!current.children.has(char)) {
        return []; // prefix not found
      }
      current = current.children.get(char)!;
    }

    // BFS to collect all words under this prefix
    const results: SearchSuggestion[] = [];
    this.dfsCollect(current, results, limit);
    return results;
  }

  /**
   * DFS to collect all words from a given node
   * Time Complexity: O(m) where m = total nodes visited
   */
  private dfsCollect(
    node: TrieNode,
    results: SearchSuggestion[],
    limit: number,
  ): void {
    if (results.length >= limit) return;

    if (node.isEnd && node.metadata) {
      results.push({
        id: node.metadata.id,
        title: node.word,
        platform: node.metadata.platform,
        difficulty: node.metadata.difficulty,
      });
    }

    for (const child of node.children.values()) {
      if (results.length >= limit) break;
      this.dfsCollect(child, results, limit);
    }
  }

  /**
   * Check if exact word exists
   * Time Complexity: O(k)
   */
  has(word: string): boolean {
    let current = this.root;
    const normalized = word.toLowerCase();

    for (const char of normalized) {
      if (!current.children.has(char)) return false;
      current = current.children.get(char)!;
    }

    return current.isEnd;
  }

  /**
   * Delete a word from the Trie
   * Time Complexity: O(k)
   */
  delete(word: string): boolean {
    return this.deleteHelper(this.root, word.toLowerCase(), 0);
  }

  private deleteHelper(node: TrieNode, word: string, depth: number): boolean {
    if (depth === word.length) {
      if (!node.isEnd) return false;
      node.isEnd = false;
      node.word = "";
      node.metadata = undefined;
      this.size--;
      return node.children.size === 0;
    }

    const char = word[depth];
    if (!node.children.has(char)) return false;

    const child = node.children.get(char)!;
    const shouldDelete = this.deleteHelper(child, word, depth + 1);

    if (shouldDelete) {
      node.children.delete(char);
      return node.children.size === 0 && !node.isEnd;
    }

    return false;
  }

  get count(): number {
    return this.size;
  }
}
