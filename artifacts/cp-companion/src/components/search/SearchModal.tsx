import { useEffect, useRef, useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import { Search, Clock, X, ArrowRight, Loader2, Trash2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, Problem, SearchHistoryItem } from '../../lib/api';
import { ClientTrie, AutocompleteItem } from '../../lib/dsa/Trie';
import { useDebounce } from '../../hooks/use-debounce';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const debounced = useDebounce(query, 250);

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Fetch all problems for Trie building (cached)
  const { data: allProblems } = useQuery<Problem[]>({
    queryKey: ['problems-all-for-trie'],
    queryFn: () =>
      api.get<{ problems: Problem[] }>('/problems?limit=1000&page=1')
        .then((r) => r.problems),
    staleTime: 5 * 60 * 1000,
    enabled: open,
  });

  // Build client-side Trie from problem list
  const trie = useMemo(() => {
    if (!allProblems?.length) return null;
    const items: AutocompleteItem[] = allProblems.map((p) => ({
      id: p.id,
      title: p.title,
      platform: p.platform,
      difficulty: p.difficulty,
    }));
    return ClientTrie.fromItems(items);
  }, [allProblems]);

  // Autocomplete suggestions from Trie — O(k) where k = query length
  const suggestions = useMemo(() => {
    if (!trie || !debounced.trim()) return [];
    return trie.suggest(debounced.trim(), 6);
  }, [trie, debounced]);

  // Search history
  const { data: history, refetch: refetchHistory } = useQuery<SearchHistoryItem[]>({
    queryKey: ['search-history'],
    queryFn: () => api.get<SearchHistoryItem[]>('/search/history?limit=8'),
    enabled: open,
  });

  const clearHistory = async () => {
    await api.delete('/search/history');
    qc.invalidateQueries({ queryKey: ['search-history'] });
  };

  const handleSearch = async (q: string) => {
    if (!q.trim()) return;
    onClose();
    navigate(`/problems?search=${encodeURIComponent(q)}`);
  };

  const difficultyColor = (d: string) =>
    d === 'Easy' ? 'text-accent' : d === 'Medium' ? 'text-[#d68a1b]' : 'text-destructive';

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-sidebar/50 px-4 pt-[10vh] backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search size={18} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(query); }}
            placeholder="Search problems by title, topic, or platform..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
          {query && (
            <button onClick={() => setQuery('')} className="shrink-0 text-muted-foreground hover:text-foreground">
              <X size={16} />
            </button>
          )}
          <kbd className="mono hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] sm:block">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Trie Autocomplete suggestions */}
          {query.trim() && suggestions.length > 0 && (
            <div className="py-2">
              <p className="mono px-4 py-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                Suggestions
              </p>
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSearch(s.title)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60"
                >
                  <Search size={14} className="shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm">{s.title}</span>
                  <span className={`mono text-[10px] font-semibold ${difficultyColor(s.difficulty)}`}>
                    {s.difficulty}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{s.platform}</span>
                  <ArrowRight size={13} className="shrink-0 text-muted-foreground" />
                </button>
              ))}
              <button
                onClick={() => handleSearch(query)}
                className="flex w-full items-center gap-3 border-t border-border px-4 py-2.5 text-sm text-accent hover:bg-muted/60"
              >
                <Search size={14} />
                Search for <strong>"{query}"</strong>
              </button>
            </div>
          )}

          {/* Search history (when no query) */}
          {!query.trim() && history && history.length > 0 && (
            <div className="py-2">
              <div className="flex items-center justify-between px-4 py-1">
                <p className="mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  Recent searches
                </p>
                <button
                  onClick={clearHistory}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
                >
                  <Trash2 size={11} /> Clear
                </button>
              </div>
              {history.map((h) => (
                <button
                  key={h.id}
                  onClick={() => handleSearch(h.query)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60"
                >
                  <Clock size={14} className="shrink-0 text-muted-foreground" />
                  <span className="flex-1 text-sm">{h.query}</span>
                  <span className="mono text-[10px] text-muted-foreground">
                    {h.resultCount} result{h.resultCount !== 1 ? 's' : ''}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!query.trim() && (!history || history.length === 0) && (
            <div className="flex flex-col items-center py-10 text-center">
              <Search size={24} className="mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Start typing to search your problems</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Search by title, topic, difficulty, or platform
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-4 py-2">
          <div className="flex gap-4 text-[10px] text-muted-foreground">
            <span><kbd className="mono rounded bg-muted px-1">↵</kbd> Search</span>
            <span><kbd className="mono rounded bg-muted px-1">↑↓</kbd> Navigate</span>
            <span><kbd className="mono rounded bg-muted px-1">ESC</kbd> Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
