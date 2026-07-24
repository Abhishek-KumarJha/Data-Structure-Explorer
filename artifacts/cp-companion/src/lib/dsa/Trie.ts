/**
 * Client-side Trie for instant autocomplete from cached problem titles
 * Mirrors the server-side Trie but works entirely in the browser
 *
 * Time Complexity: Insert O(k), Search O(k + m)
 * Space Complexity: O(n * k)
 */

interface TrieNode {
  children: Map<string, TrieNode>;
  isEnd: boolean;
  data?: AutocompleteItem;
}

export interface AutocompleteItem {
  id: number;
  title: string;
  platform: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export class ClientTrie {
  private root: TrieNode;
  private count = 0;

  constructor() {
    this.root = this.makeNode();
  }

  private makeNode(): TrieNode {
    return { children: new Map(), isEnd: false };
  }

  /** Insert a problem title — O(k) */
  insert(item: AutocompleteItem): void {
    this.insertWord(item.title, item);
    // Also index individual words for sub-word search
    const words = item.title.split(/\s+/);
    for (const word of words) {
      if (word.length >= 3) {
        this.insertWord(word, item);
      }
    }
  }

  private insertWord(word: string, data: AutocompleteItem): void {
    let node = this.root;
    const lower = word.toLowerCase();
    for (const ch of lower) {
      if (!node.children.has(ch)) node.children.set(ch, this.makeNode());
      node = node.children.get(ch)!;
    }
    if (!node.isEnd) this.count++;
    node.isEnd = true;
    node.data = data;
  }

  /** Get up to `limit` suggestions for a prefix — O(k + m) */
  suggest(prefix: string, limit = 8): AutocompleteItem[] {
    let node = this.root;
    const lower = prefix.toLowerCase();
    for (const ch of lower) {
      if (!node.children.has(ch)) return [];
      node = node.children.get(ch)!;
    }

    const results: AutocompleteItem[] = [];
    this.dfs(node, results, limit);
    return results;
  }

  private dfs(node: TrieNode, results: AutocompleteItem[], limit: number): void {
    if (results.length >= limit) return;
    if (node.isEnd && node.data) {
      // Deduplicate by id
      if (!results.some((r) => r.id === node.data!.id)) {
        results.push(node.data);
      }
    }
    for (const child of node.children.values()) {
      if (results.length >= limit) break;
      this.dfs(child, results, limit);
    }
  }

  /** Build from array of items — O(n * k) */
  static fromItems(items: AutocompleteItem[]): ClientTrie {
    const trie = new ClientTrie();
    for (const item of items) trie.insert(item);
    return trie;
  }

  get size(): number {
    return this.count;
  }
}
