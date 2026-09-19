import { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  Search, Clock, X, ArrowRight, Loader2, Trash2, Tag, AlertCircle, RotateCcw,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, AutocompleteSuggestion, AutocompleteResponse, SearchHistoryItem } from '../../lib/api';
import { queryKeys } from '../../lib/query-keys';
import { useDebounce } from '../../hooks/use-debounce';
import { highlightMatch } from '../../lib/search';

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();

  const debounced = useDebounce(query, 250);

  // Reset state and focus input when modal opens
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  // Autocomplete query using server endpoint with AbortController signal
  const {
    data: autocompleteData,
    isLoading: isAutocompleteLoading,
    isError: isAutocompleteError,
    refetch: refetchAutocomplete,
  } = useQuery<AutocompleteResponse>({
    queryKey: queryKeys.search.autocomplete(debounced.trim()),
    queryFn: ({ signal }) =>
      api.get<AutocompleteResponse>(
        `/search/autocomplete?q=${encodeURIComponent(debounced.trim())}&limit=8`,
        { signal },
      ),
    enabled: open && debounced.trim().length >= 1,
    staleTime: 60 * 1000,
  });

  const suggestions: AutocompleteSuggestion[] = autocompleteData?.suggestions ?? [];

  // Search history query
  const {
    data: history = [],
    isLoading: isHistoryLoading,
  } = useQuery<SearchHistoryItem[]>({
    queryKey: queryKeys.search.history(),
    queryFn: () => api.get<SearchHistoryItem[]>('/search/history?limit=8'),
    enabled: open && !debounced.trim(),
  });

  // History delete mutations
  const deleteHistoryItemMutation = useMutation({
    mutationFn: (id: number) => api.deleteSearchHistoryItem(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.search.history() });
    },
  });

  const clearAllHistoryMutation = useMutation({
    mutationFn: () => api.delete('/search/history'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.search.history() });
    },
  });

  const handleSearch = useCallback((q: string) => {
    const clean = q.trim();
    if (!clean) return;
    onClose();
    // Record to history explicitly
    api.recordSearchHistory(clean).catch(() => {});
    navigate(`/problems?search=${encodeURIComponent(clean)}`);
  }, [navigate, onClose]);

  // Total selectable items count for keyboard navigation
  // When query is typed: suggestions + 1 ("Search for '<query>'")
  // When no query: history items
  const isTyping = debounced.trim().length >= 1;
  const selectableCount = isTyping
    ? suggestions.length + 1
    : history.length;

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(-1);
  }, [debounced]);

  // Keyboard navigation: ArrowUp, ArrowDown, Enter, Escape
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (selectableCount === 0) return;
        setSelectedIndex((prev) => (prev + 1) % selectableCount);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (selectableCount === 0) return;
        setSelectedIndex((prev) => (prev - 1 + selectableCount) % selectableCount);
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        if (isTyping) {
          if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
            handleSearch(suggestions[selectedIndex].title);
          } else {
            handleSearch(query);
          }
        } else {
          if (selectedIndex >= 0 && selectedIndex < history.length) {
            handleSearch(history[selectedIndex].query);
          } else if (query.trim()) {
            handleSearch(query);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, selectableCount, selectedIndex, isTyping, suggestions, history, query, handleSearch]);

  const difficultyColor = (d: string) =>
    d === 'Easy'
      ? 'bg-accent/15 text-accent border-accent/30'
      : d === 'Medium'
        ? 'bg-[#d68a1b]/15 text-[#b56d07] border-[#d68a1b]/30'
        : 'bg-destructive/15 text-destructive border-destructive/30';

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quick Search"
      className="fixed inset-0 z-50 flex items-start justify-center bg-sidebar/60 px-4 pt-[8vh] backdrop-blur-sm sm:pt-[12vh]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all">
        {/* Search input bar */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
          <Search size={18} className="shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search problems by title, topic, platform..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            aria-label="Search problems input"
          />
          {isAutocompleteLoading && (
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          )}
          {query && !isAutocompleteLoading && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Clear search query"
            >
              <X size={15} />
            </button>
          )}
          <kbd className="mono hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Results / Autocomplete / History list */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
          {/* Autocomplete Error State */}
          {isTyping && isAutocompleteError && (
            <div className="flex items-center justify-between p-4 text-xs text-destructive">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} />
                <span>Failed to fetch suggestions from server.</span>
              </div>
              <button
                type="button"
                onClick={() => refetchAutocomplete()}
                className="inline-flex items-center gap-1 rounded border border-destructive/30 px-2 py-1 font-semibold hover:bg-destructive/10"
              >
                <RotateCcw size={12} /> Retry
              </button>
            </div>
          )}

          {/* Autocomplete Suggestions */}
          {isTyping && !isAutocompleteError && (
            <div className="py-2">
              <p className="mono px-4 py-1 text-[9px] uppercase tracking-widest text-muted-foreground">
                Live Suggestions
              </p>

              {suggestions.map((s, idx) => {
                const isSelected = selectedIndex === idx;
                const segments = highlightMatch(s.title, debounced);

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleSearch(s.title)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-accent/10 text-foreground' : 'hover:bg-muted/60'
                    }`}
                  >
                    <Search size={14} className={`shrink-0 ${isSelected ? 'text-accent' : 'text-muted-foreground'}`} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {segments.map((seg, i) =>
                          seg.highlight ? (
                            <span key={i} className="font-bold text-accent underline decoration-accent/40">
                              {seg.text}
                            </span>
                          ) : (
                            <span key={i}>{seg.text}</span>
                          ),
                        )}
                      </div>
                      {s.topics && s.topics.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                          <span>{s.topics.slice(0, 2).join(' · ')}</span>
                        </div>
                      )}
                    </div>
                    <span className={`mono rounded border px-1.5 py-0.5 text-[9px] font-semibold ${difficultyColor(s.difficulty)}`}>
                      {s.difficulty}
                    </span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {s.platform}
                    </span>
                    <ArrowRight size={13} className={`shrink-0 ${isSelected ? 'text-accent' : 'text-muted-foreground/40'}`} />
                  </button>
                );
              })}

              {/* Explicit Search Option Row */}
              <button
                type="button"
                onClick={() => handleSearch(query)}
                onMouseEnter={() => setSelectedIndex(suggestions.length)}
                className={`flex w-full items-center gap-3 border-t border-border px-4 py-3 text-sm transition-colors ${
                  selectedIndex === suggestions.length ? 'bg-accent/15 text-accent' : 'text-accent hover:bg-muted/60'
                }`}
              >
                <Search size={15} />
                <span className="flex-1 truncate">
                  Search all problems for <strong>"{query.trim()}"</strong>
                </span>
                <kbd className="mono rounded bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                  ↵ Enter
                </kbd>
              </button>

              {/* No suggestions empty state */}
              {!isAutocompleteLoading && suggestions.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">No direct matches for "{debounced}"</p>
                  <p className="mt-1">Press Enter or click below to search all problem topics, notes, and tags.</p>
                </div>
              )}
            </div>
          )}

          {/* Recent Searches (when query is empty) */}
          {!isTyping && history && history.length > 0 && (
            <div className="py-2">
              <div className="flex items-center justify-between px-4 py-1.5">
                <p className="mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  Recent searches
                </p>
                <button
                  type="button"
                  onClick={() => clearAllHistoryMutation.mutate()}
                  disabled={clearAllHistoryMutation.isPending}
                  className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  aria-label="Clear all search history"
                >
                  <Trash2 size={11} /> Clear all
                </button>
              </div>

              {history.map((h, idx) => {
                const isSelected = selectedIndex === idx;

                return (
                  <div
                    key={h.id}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`group flex items-center justify-between px-4 py-2.5 transition-colors ${
                      isSelected ? 'bg-muted/70 text-foreground' : 'hover:bg-muted/40'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSearch(h.query)}
                      className="flex flex-1 items-center gap-3 text-left outline-none"
                    >
                      <Clock size={14} className="shrink-0 text-muted-foreground" />
                      <span className="flex-1 truncate text-sm">{h.query}</span>
                      <span className="mono text-[10px] text-muted-foreground mr-2">
                        {h.resultCount} result{h.resultCount !== 1 ? 's' : ''}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteHistoryItemMutation.mutate(h.id);
                      }}
                      className="rounded p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:bg-muted hover:text-destructive group-hover:opacity-100"
                      aria-label={`Remove search "${h.query}" from history`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Empty search prompt (no query & no history) */}
          {!isTyping && (!history || history.length === 0) && (
            <div className="flex flex-col items-center py-12 px-6 text-center">
              <div className="mb-3 rounded-xl bg-muted/60 p-3 text-muted-foreground">
                <Search size={22} />
              </div>
              <p className="text-sm font-semibold text-foreground">Quick Problem Search</p>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                Start typing to search your problem library by title, topic, platform, or difficulty.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                {['Binary Search', 'Dynamic Programming', 'Graph', 'Tree', 'LeetCode'].map((pill) => (
                  <button
                    key={pill}
                    type="button"
                    onClick={() => {
                      setQuery(pill);
                      inputRef.current?.focus();
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-accent hover:text-accent"
                  >
                    <Tag size={10} /> {pill}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="border-t border-border bg-muted/20 px-4 py-2.5">
          <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="mono rounded border border-border bg-muted px-1.5 py-0.5 text-[9px]">↑↓</kbd> Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="mono rounded border border-border bg-muted px-1.5 py-0.5 text-[9px]">↵</kbd> Select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="mono rounded border border-border bg-muted px-1.5 py-0.5 text-[9px]">ESC</kbd> Close
              </span>
            </div>
            <span className="mono text-[10px] opacity-70">CP Companion</span>
          </div>
        </div>
      </div>
    </div>
  );
}
