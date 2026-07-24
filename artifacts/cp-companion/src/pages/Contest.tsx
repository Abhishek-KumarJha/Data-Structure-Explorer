import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Command, ChevronRight, Check, Trophy, Clock, Loader2, Plus, Shuffle, History, X, AlertCircle } from 'lucide-react';
import { api, Contest as ContestType, ContestProblem } from '../lib/api';
import Page from '../components/layout/Page';

function DifficultyBadge({ value }: { value: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${value === 'Easy' ? 'bg-accent/10 text-accent' : value === 'Medium' ? 'bg-[#d68a1b]/10 text-[#b56d07]' : 'bg-destructive/10 text-destructive'}`}>
      {value}
    </span>
  );
}

function Timer({ endsAt, onExpire }: { endsAt: string; onExpire?: () => void }) {
  const calcRemaining = () => Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000));
  const [remaining, setRemaining] = useState(calcRemaining);

  useEffect(() => {
    if (remaining <= 0) { onExpire?.(); return; }
    const id = setInterval(() => {
      const r = calcRemaining();
      setRemaining(r);
      if (r <= 0) { clearInterval(id); onExpire?.(); }
    }, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');

  return (
    <div className="rounded-xl border border-border bg-background px-5 py-3 text-center">
      <p className="mono text-[9px] uppercase tracking-widest text-muted-foreground">Time left</p>
      <p className={`mono mt-1 text-2xl font-bold ${remaining < 300 ? 'text-destructive' : 'text-foreground'}`}>
        {h > 0 ? `${h}:` : ''}{m}:{s}
      </p>
    </div>
  );
}

function ContestView({ contest, onComplete }: { contest: ContestType; onComplete: () => void }) {
  const qc = useQueryClient();

  const { data: liveContest } = useQuery<ContestType>({
    queryKey: ['contest', contest.id],
    queryFn: () => api.get<ContestType>(`/contests/${contest.id}`),
    refetchInterval: 10000, // poll every 10s
  });

  const c = liveContest ?? contest;
  const problems = (c.problems ?? []) as ContestProblem[];
  const solved = problems.filter((p) => p.solved).length;
  const isCompleted = c.status === 'completed' || (c.timeRemaining !== undefined && c.timeRemaining <= 0);

  const submitMutation = useMutation({
    mutationFn: ({ problemId }: { problemId: number }) =>
      api.post(`/contests/${contest.id}/problems/${problemId}/submit`, {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contest', contest.id] }),
  });

  const completeMutation = useMutation({
    mutationFn: () => api.patch(`/contests/${contest.id}/complete`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contests'] }); onComplete(); },
  });

  return (
    <div className="grid-paper overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-col justify-between gap-5 border-b border-border p-6 md:flex-row md:items-center md:p-8">
        <div>
          <div className="flex items-center gap-2 text-accent">
            <Command size={18} />
            <span className="mono text-[10px] uppercase tracking-[.16em]">
              solo arena · {c.type} contest
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight">{c.name}</h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">
            {problems.length} problems · {c.durationMinutes} minutes
          </p>
        </div>
        <div className="flex items-center gap-4">
          {!isCompleted && <Timer endsAt={c.endsAt} onExpire={() => completeMutation.mutate()} />}
          {isCompleted ? (
            <div className="rounded-xl border border-accent/30 bg-accent/10 px-5 py-3 text-center">
              <p className="mono text-[9px] uppercase tracking-widest text-accent">Final score</p>
              <p className="mono mt-1 text-2xl font-bold text-accent">{solved}/{problems.length}</p>
            </div>
          ) : (
            <button
              onClick={() => completeMutation.mutate()}
              disabled={completeMutation.isPending}
              className="rounded-lg border border-border bg-background px-4 py-3 text-sm font-bold hover:border-destructive hover:text-destructive"
            >
              End contest
            </button>
          )}
        </div>
      </div>

      <div className="p-5 md:p-8">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-semibold">Problem set</h3>
          <span className="mono text-[10px] text-muted-foreground">{solved} / {problems.length} SUBMITTED</span>
        </div>
        <div className="space-y-2">
          {problems.map((p) => (
            <div key={p.id} className="flex items-center gap-4 rounded-xl border border-border bg-background p-4">
              <span className={`mono flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${p.solved ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                {p.label}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{p.title}</p>
                <div className="mt-1 flex items-center gap-2">
                  <DifficultyBadge value={p.difficulty} />
                  <span className="text-xs text-muted-foreground">{p.platform}</span>
                  {p.solved && p.timeTakenSeconds && (
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock size={10} /> {Math.floor(p.timeTakenSeconds / 60)}m {p.timeTakenSeconds % 60}s
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {p.solved ? (
                  <span className="flex items-center gap-1 text-[11px] text-accent">
                    <Check size={14} /> Solved
                  </span>
                ) : !isCompleted ? (
                  <button
                    onClick={() => submitMutation.mutate({ problemId: p.id })}
                    disabled={submitMutation.isPending}
                    className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    Mark solved
                  </button>
                ) : null}
                {p.solutionLink && (
                  <a href={p.solutionLink} target="_blank" rel="noreferrer"
                    className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:border-accent">
                    Open <ChevronRight className="ml-1 inline" size={13} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Contest() {
  const qc = useQueryClient();
  const [activeContest, setActiveContest] = useState<ContestType | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: 'My Contest', type: 'random' as 'random' | 'custom',
    durationMinutes: 90, problemCount: 4,
    difficulty: 'Mixed' as 'Easy' | 'Medium' | 'Hard' | 'Mixed',
  });

  const { data: historyContests } = useQuery<ContestType[]>({
    queryKey: ['contests'],
    queryFn: () => api.get<ContestType[]>('/contests'),
    enabled: showHistory,
  });

  const { data: historyStats } = useQuery({
    queryKey: ['contest-stats'],
    queryFn: () => api.get<{ totalContests: number; completed: number; avgScore: number; bestScore: number }>('/contests/history/stats'),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof createForm) => api.post<ContestType>('/contests', body),
    onSuccess: (contest) => {
      setActiveContest(contest);
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ['contests'] });
    },
  });

  if (activeContest && activeContest.status === 'active') {
    return (
      <Page eyebrow="Virtual contest" title="Make it count.">
        <ContestView contest={activeContest} onComplete={() => setActiveContest(null)} />
      </Page>
    );
  }

  return (
    <Page
      eyebrow="Virtual contest"
      title="Make it count."
      description="A quiet room for a timed set. No leaderboard, no noise — just the next problem."
      action={
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:border-accent"
          >
            <History size={16} /> History
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus size={16} /> New contest
          </button>
        </div>
      }
    >
      {/* Stats */}
      {historyStats && (
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          {[
            { label: 'Total contests', value: historyStats.totalContests },
            { label: 'Completed', value: historyStats.completed },
            { label: 'Avg score', value: `${historyStats.avgScore.toFixed(1)}` },
            { label: 'Best score', value: historyStats.bestScore },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Welcome card */}
      <div className="grid-paper overflow-hidden rounded-2xl border border-border bg-card p-8 text-center">
        <div className="flex items-center justify-center gap-2 text-accent">
          <Trophy size={20} />
          <span className="mono text-[10px] uppercase tracking-[.16em]">Ready to compete?</span>
        </div>
        <h2 className="mt-4 text-3xl font-bold tracking-tight">Start a new contest</h2>
        <p className="mt-3 max-w-md mx-auto text-sm text-muted-foreground">
          Problems will be randomly selected from your library using a greedy difficulty-balanced algorithm.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={() => createMutation.mutate({ ...createForm, type: 'random' })}
            disabled={createMutation.isPending}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Shuffle size={16} />}
            Quick random contest
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-bold hover:border-accent"
          >
            <Plus size={16} /> Custom contest
          </button>
        </div>
      </div>

      {/* History list */}
      {showHistory && (
        <div className="mt-6">
          <h3 className="mb-4 font-semibold">Contest History</h3>
          {historyContests?.length ? (
            <div className="space-y-2">
              {historyContests.map((c) => (
                <div key={c.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${c.status === 'completed' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                    {c.score}/{c.totalProblems ?? '?'}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{c.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(c.startedAt).toLocaleDateString()} · {c.durationMinutes}min · {c.type}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.status === 'completed' ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
                    {c.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-8">No contests yet. Start your first one!</p>
          )}
        </div>
      )}

      {/* Create Contest Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/40 p-5">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Configure contest</h2>
              <button onClick={() => setShowCreate(false)}><X size={19} /></button>
            </div>
            <div className="mt-6 space-y-4">
              <label className="block text-xs font-semibold">
                Name
                <input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent" />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold">
                  Duration
                  <select value={createForm.durationMinutes} onChange={(e) => setCreateForm({ ...createForm, durationMinutes: Number(e.target.value) })}
                    className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                    <option value={30}>30 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>2 hours</option>
                  </select>
                </label>
                <label className="text-xs font-semibold">
                  Problems
                  <select value={createForm.problemCount} onChange={(e) => setCreateForm({ ...createForm, problemCount: Number(e.target.value) })}
                    className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                    <option value={2}>2</option><option value={3}>3</option>
                    <option value={4}>4</option><option value={5}>5</option><option value={6}>6</option>
                  </select>
                </label>
              </div>
              <label className="text-xs font-semibold">
                Difficulty mix
                <select value={createForm.difficulty} onChange={(e) => setCreateForm({ ...createForm, difficulty: e.target.value as typeof createForm.difficulty })}
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm">
                  <option value="Mixed">Mixed (Balanced)</option>
                  <option value="Easy">Easy only</option>
                  <option value="Medium">Medium only</option>
                  <option value="Hard">Hard only</option>
                </select>
              </label>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-lg border border-border py-2.5 text-sm font-semibold">Cancel</button>
                <button onClick={() => createMutation.mutate(createForm)}
                  disabled={createMutation.isPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Start contest
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Page>
  );
}
