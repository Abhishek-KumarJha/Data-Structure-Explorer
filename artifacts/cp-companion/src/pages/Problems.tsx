import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Search, Filter, Heart, CheckCircle2, Pencil, Trash2,
  ExternalLink, X, Database, Bookmark, ChevronLeft, ChevronRight,
  Tag, Loader2, StickyNote,
} from 'lucide-react';
import { api, Problem, ProblemsResponse } from '../lib/api';
import { useDebounce } from '../hooks/use-debounce';
import Page from '../components/layout/Page';

type Difficulty = 'Easy' | 'Medium' | 'Hard';
type Status = 'Solved' | 'Unsolved';

interface ProblemForm {
  title: string;
  platform: string;
  difficulty: Difficulty;
  topics: string;
  companyTags: string;
  solutionLink: string;
  notes: string;
  status: Status;
}

const DEFAULT_FORM: ProblemForm = {
  title: '', platform: 'LeetCode', difficulty: 'Medium',
  topics: '', companyTags: '', solutionLink: '', notes: '', status: 'Unsolved',
};

const PLATFORMS = ['LeetCode', 'Codeforces', 'AtCoder', 'NeetCode', 'CSES', 'HackerRank', 'GeeksForGeeks', 'CodeChef'];

function DifficultyBadge({ value }: { value: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${value === 'Easy' ? 'bg-accent/10 text-accent' : value === 'Medium' ? 'bg-[#d68a1b]/10 text-[#b56d07]' : 'bg-destructive/10 text-destructive'}`}>
      {value}
    </span>
  );
}

function Empty({ title, text, icon: Icon = Database }: { title: string; text: string; icon?: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <div className="mb-4 rounded-xl bg-muted p-3 text-muted-foreground"><Icon size={22} /></div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function ProblemRow({ p, onToggleFav, onToggleBookmark, onEdit, onDelete, onSolve, onNote }: {
  p: Problem;
  onToggleFav: () => void;
  onToggleBookmark: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSolve: () => void;
  onNote: () => void;
}) {
  return (
    <div className="group mb-2 flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent/40">
      <button
        aria-label={`Favorite ${p.title}`}
        onClick={onToggleFav}
        className={`shrink-0 transition-colors ${p.favorite ? 'text-[#d68a1b]' : 'text-muted-foreground/35 hover:text-[#d68a1b]'}`}
      >
        <Heart size={16} fill={p.favorite ? 'currentColor' : 'none'} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold">{p.title}</span>
          <DifficultyBadge value={p.difficulty} />
          {p.bookmark && <Bookmark size={12} className="text-accent fill-accent" />}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{p.platform}</span>
          {p.topics.length > 0 && (
            <><span className="text-border">/</span><span>{p.topics.slice(0, 2).join(' · ')}</span></>
          )}
          {p.companyTags.length > 0 && (
            <span className="flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[9px]">
              <Tag size={9} />{p.companyTags[0]}
            </span>
          )}
        </div>
      </div>
      <div className={`hidden items-center gap-1.5 text-[11px] sm:flex ${p.status === 'Solved' ? 'text-accent' : 'text-muted-foreground'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${p.status === 'Solved' ? 'bg-accent' : 'bg-muted-foreground/40'}`} />
        {p.status}
      </div>
      <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button aria-label={p.status === 'Solved' ? 'Mark unsolved' : 'Mark solved'} onClick={onSolve}
          className={`rounded p-1.5 hover:bg-muted ${p.status === 'Solved' ? 'text-accent' : 'text-muted-foreground'}`}>
          <CheckCircle2 size={15} />
        </button>
        <button aria-label="Add note" onClick={onNote}
          className={`rounded p-1.5 hover:bg-muted ${p.notes ? 'text-accent' : 'text-muted-foreground'}`}>
          <StickyNote size={15} />
        </button>
        <button aria-label="Bookmark" onClick={onToggleBookmark}
          className={`rounded p-1.5 hover:bg-muted ${p.bookmark ? 'text-accent' : 'text-muted-foreground'}`}>
          <Bookmark size={15} fill={p.bookmark ? 'currentColor' : 'none'} />
        </button>
        <button aria-label={`Edit ${p.title}`} onClick={onEdit}
          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-accent">
          <Pencil size={15} />
        </button>
        <button aria-label={`Delete ${p.title}`} onClick={onDelete}
          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
          <Trash2 size={15} />
        </button>
        {p.solutionLink && (
          <a href={p.solutionLink} target="_blank" rel="noreferrer"
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-accent">
            <ExternalLink size={15} />
          </a>
        )}
      </div>
    </div>
  );
}

export default function Problems() {
  const [, rawLocation] = useLocation();
  const qc = useQueryClient();

  // Filters
  const urlParams = new URLSearchParams(window.location.search);
  const [search, setSearch] = useState(urlParams.get('search') ?? '');
  const [difficulty, setDifficulty] = useState('All');
  const [status, setStatus] = useState('All');
  const [favorites, setFavorites] = useState(false);
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Forms
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Problem | null>(null);
  const [form, setForm] = useState<ProblemForm>(DEFAULT_FORM);

  // Notes
  const [noteFor, setNoteFor] = useState<Problem | null>(null);
  const [noteContent, setNoteContent] = useState('');

  const debouncedSearch = useDebounce(search, 350);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [debouncedSearch, difficulty, status, favorites, bookmarksOnly]);

  const params = new URLSearchParams({
    page: String(page),
    limit: '20',
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(difficulty !== 'All' ? { difficulty } : {}),
    ...(status !== 'All' ? { status } : {}),
    ...(favorites ? { favoritesOnly: 'true' } : {}),
    ...(bookmarksOnly ? { bookmarksOnly: 'true' } : {}),
  });

  const { data, isLoading, isError } = useQuery<ProblemsResponse>({
    queryKey: ['problems', params.toString()],
    queryFn: () => api.get<ProblemsResponse>(`/problems?${params}`),
    staleTime: 10 * 1000,
    placeholderData: (prev) => prev,
  });

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ['problems'] });
    qc.invalidateQueries({ queryKey: ['analytics-summary'] });
    qc.invalidateQueries({ queryKey: ['problems-all-for-trie'] });
  }, [qc]);

  const createMutation = useMutation({
    mutationFn: (body: Partial<Problem>) => api.post<Problem>('/problems', body),
    onSuccess: () => { invalidate(); setShowForm(false); setForm(DEFAULT_FORM); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Problem> }) =>
      api.patch<Problem>(`/problems/${id}`, data),
    onSuccess: () => { invalidate(); setShowForm(false); setEditing(null); setForm(DEFAULT_FORM); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/problems/${id}`),
    onSuccess: invalidate,
  });

  const noteMutation = useMutation({
    mutationFn: ({ id, content }: { id: number; content: string }) =>
      api.patch(`/problems/${id}`, { notes: content }),
    onSuccess: () => { invalidate(); setNoteFor(null); },
  });

  const openEdit = (p: Problem) => {
    setEditing(p);
    setForm({
      title: p.title, platform: p.platform, difficulty: p.difficulty,
      topics: p.topics.join(', '), companyTags: p.companyTags.join(', '),
      solutionLink: p.solutionLink, notes: p.notes, status: p.status,
    });
    setShowForm(true);
  };

  const submit = () => {
    if (!form.title.trim()) return;
    const body = {
      title: form.title.trim(),
      platform: form.platform,
      difficulty: form.difficulty,
      topics: form.topics.split(',').map((t) => t.trim()).filter(Boolean),
      companyTags: form.companyTags.split(',').map((t) => t.trim()).filter(Boolean),
      solutionLink: form.solutionLink.trim(),
      notes: form.notes,
      status: form.status,
    };
    if (editing) {
      updateMutation.mutate({ id: editing.id, data: body });
    } else {
      createMutation.mutate(body);
    }
  };

  const problems = data?.problems ?? [];

  return (
    <Page
      eyebrow="Problem library"
      title="Your problem set."
      description="Collect the patterns worth remembering."
      action={
        <button
          onClick={() => { setEditing(null); setForm(DEFAULT_FORM); setShowForm(true); }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus size={16} /> Add problem
        </button>
      }
    >
      {isError && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-[#d68a1b]/30 bg-[#d68a1b]/5 p-3 text-xs text-[#9b5e08]">
          <Database size={14} /> Failed to load problems. Check your connection.
        </div>
      )}

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-border bg-card p-3 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, topic, company, or platform..."
            className="h-10 w-full rounded-lg bg-muted/50 pl-10 pr-3 text-sm outline-none ring-accent focus:ring-2"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-xs outline-none">
            <option>All</option><option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-lg border border-border bg-card px-3 text-xs outline-none">
            <option>All</option><option>Solved</option><option>Unsolved</option>
          </select>
          <button onClick={() => setFavorites(!favorites)}
            className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-xs ${favorites ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground'}`}>
            <Heart size={14} fill={favorites ? 'currentColor' : 'none'} /> Favorites
          </button>
          <button onClick={() => setBookmarksOnly(!bookmarksOnly)}
            className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-xs ${bookmarksOnly ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground'}`}>
            <Bookmark size={14} fill={bookmarksOnly ? 'currentColor' : 'none'} /> Bookmarks
          </button>
        </div>
      </div>

      {/* Count + solved */}
      <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{data?.total ?? 0} problems{debouncedSearch ? ` matching "${debouncedSearch}"` : ''}</span>
        <span className="mono">{problems.filter((p) => p.status === 'Solved').length} solved on this page</span>
      </div>

      {/* Problem list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-[74px] animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : problems.length ? (
        <div>
          {problems.map((p) => (
            <ProblemRow
              key={p.id}
              p={p}
              onToggleFav={() => updateMutation.mutate({ id: p.id, data: { favorite: !p.favorite } })}
              onToggleBookmark={() => updateMutation.mutate({ id: p.id, data: { bookmark: !p.bookmark } })}
              onSolve={() => updateMutation.mutate({ id: p.id, data: { status: p.status === 'Solved' ? 'Unsolved' : 'Solved' } })}
              onEdit={() => openEdit(p)}
              onDelete={() => { if (confirm(`Delete "${p.title}"?`)) deleteMutation.mutate(p.id); }}
              onNote={() => { setNoteFor(p); setNoteContent(p.notes ?? ''); }}
            />
          ))}
        </div>
      ) : (
        <Empty title="No problems found" text="Try a different filter or add a problem to your library." icon={Search} />
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:border-accent"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="mono text-xs text-muted-foreground">
            Page {page} of {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border disabled:opacity-40 hover:border-accent"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-sidebar/40 p-0 sm:items-center sm:p-5">
          <div className="w-full max-w-lg rounded-t-2xl border border-border bg-card p-6 shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{editing ? 'Edit problem' : 'Add a problem'}</h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }}><X size={19} /></button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block text-xs font-semibold">
                Title
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Binary Tree Maximum Path Sum"
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold">
                  Platform
                  <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                    {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </label>
                <label className="text-xs font-semibold">
                  Difficulty
                  <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}
                    className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                    <option>Easy</option><option>Medium</option><option>Hard</option>
                  </select>
                </label>
              </div>
              <label className="block text-xs font-semibold">
                Status
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option>Unsolved</option><option>Solved</option>
                </select>
              </label>
              <label className="block text-xs font-semibold">
                Topics <span className="font-normal text-muted-foreground">(comma separated)</span>
                <input value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })}
                  placeholder="Graphs, BFS, Shortest Path"
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent" />
              </label>
              <label className="block text-xs font-semibold">
                Company tags <span className="font-normal text-muted-foreground">(comma separated)</span>
                <input value={form.companyTags} onChange={(e) => setForm({ ...form, companyTags: e.target.value })}
                  placeholder="Google, Amazon, Meta"
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent" />
              </label>
              <label className="block text-xs font-semibold">
                Solution link <span className="font-normal text-muted-foreground">(optional)</span>
                <input value={form.solutionLink} onChange={(e) => setForm({ ...form, solutionLink: e.target.value })}
                  placeholder="https://"
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent" />
              </label>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setEditing(null); }}
                  className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold">
                  Cancel
                </button>
                <button onClick={submit}
                  disabled={!form.title.trim() || createMutation.isPending || updateMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  {(createMutation.isPending || updateMutation.isPending) && <Loader2 size={14} className="animate-spin" />}
                  {editing ? 'Save changes' : 'Add to library'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {noteFor && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-sidebar/40 p-0 sm:items-center sm:p-5">
          <div className="w-full max-w-lg rounded-t-2xl border border-border bg-card p-6 shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Notes</h2>
                <p className="mt-1 text-xs text-muted-foreground">{noteFor.title}</p>
              </div>
              <button onClick={() => setNoteFor(null)}><X size={19} /></button>
            </div>
            <textarea
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
              placeholder="Add your notes, hints, or approach for this problem..."
              rows={6}
              className="mt-4 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-accent resize-none"
            />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setNoteFor(null)}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold">Cancel</button>
              <button
                onClick={() => noteMutation.mutate({ id: noteFor.id, content: noteContent })}
                disabled={noteMutation.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {noteMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Save note
              </button>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
