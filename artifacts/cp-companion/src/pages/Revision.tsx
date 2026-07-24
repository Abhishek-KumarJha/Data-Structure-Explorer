import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BrainCircuit, RefreshCw, Zap, ChevronRight, Check, Star, Loader2, AlertCircle } from 'lucide-react';
import { api, RevisionQueueResponse, RevisionQueueItem } from '../lib/api';
import Page from '../components/layout/Page';

function Stat({ label, value, sub, icon: Icon, accent = false }: {
  label: string; value: string | number; sub: string; icon: React.ElementType; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-5 ${accent ? 'border-accent/30 bg-accent/[.06]' : 'border-border bg-card'}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
        </div>
        <div className={`rounded-lg p-2 ${accent ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
          <Icon size={17} />
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function QualityRater({ onRate, loading }: { onRate: (q: number) => void; loading: boolean }) {
  const ratings = [
    { q: 0, label: 'Blackout', color: 'bg-destructive/90' },
    { q: 1, label: 'Wrong', color: 'bg-destructive/60' },
    { q: 2, label: 'Forgot', color: 'bg-[#d68a1b]/60' },
    { q: 3, label: 'Hard', color: 'bg-[#d68a1b]/90' },
    { q: 4, label: 'Good', color: 'bg-accent/60' },
    { q: 5, label: 'Perfect', color: 'bg-accent' },
  ];

  return (
    <div className="mt-4">
      <p className="mb-3 text-xs font-semibold text-muted-foreground">How well did you recall it?</p>
      <div className="flex gap-2">
        {ratings.map(({ q, label, color }) => (
          <button
            key={q}
            onClick={() => onRate(q)}
            disabled={loading}
            className={`flex-1 rounded-lg py-2 text-[10px] font-bold text-white transition-transform hover:scale-105 disabled:opacity-50 ${color}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function Revision() {
  const qc = useQueryClient();
  const [reviewing, setReviewing] = useState<number | null>(null);

  const { data, isLoading, isError } = useQuery<RevisionQueueResponse>({
    queryKey: ['revision-queue'],
    queryFn: () => api.get<RevisionQueueResponse>('/revision/queue?limit=20'),
    staleTime: 30 * 1000,
  });

  const completeMutation = useMutation({
    mutationFn: ({ problemId, quality }: { problemId: number; quality: number }) =>
      api.post(`/revision/${problemId}/complete`, { quality }),
    onSuccess: () => {
      setReviewing(null);
      qc.invalidateQueries({ queryKey: ['revision-queue'] });
      qc.invalidateQueries({ queryKey: ['revision-stats'] });
    },
  });

  const queue = data?.queue ?? [];
  const stats = data?.stats ?? { dueToday: 0, reviewRhythm: 0, retention: 0 };

  const diffColor = (d: string) =>
    d === 'Easy' ? 'bg-accent/10 text-accent' : d === 'Medium' ? 'bg-[#d68a1b]/10 text-[#b56d07]' : 'bg-destructive/10 text-destructive';

  return (
    <Page
      eyebrow="Spaced repetition"
      title="Revision queue."
      description="Problems ordered by the SM-2 spaced repetition algorithm — review what matters most."
    >
      <div className="mb-7 grid gap-4 sm:grid-cols-3">
        <Stat label="Due today" value={stats.dueToday} sub="problems need attention" icon={BrainCircuit} accent />
        <Stat label="Review rhythm" value={`${stats.reviewRhythm} days`} sub="average between reviews" icon={RefreshCw} />
        <Stat label="Retention" value={`${stats.retention}%`} sub="across reviewed patterns" icon={Zap} />
      </div>

      {isError && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-[#d68a1b]/30 bg-[#d68a1b]/5 p-3 text-xs text-[#9b5e08]">
          <AlertCircle size={14} /> Failed to load revision queue.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Priority stack</h2>
            <span className="mono text-[10px] text-muted-foreground">SORTED BY IMPACT · SM-2</span>
          </div>

          {isLoading ? (
            <div className="h-48 animate-pulse rounded-xl bg-muted" />
          ) : queue.length > 0 ? (
            <div>
              {queue.map((item, i) => (
                <div key={item.id} className="mb-3 overflow-hidden rounded-xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:border-accent/40">
                  <div className="flex items-center gap-4 p-4">
                    <div className={`mono flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs ${item.isDue ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-semibold">{item.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${diffColor(item.difficulty)}`}>
                          {item.difficulty}
                        </span>
                        {item.isDue && (
                          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">Due</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.platform} · {item.topics.slice(0, 2).join(' · ')} · {item.repetitions} review{item.repetitions !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {reviewing === item.id ? null : (
                        <button
                          onClick={() => setReviewing(item.id)}
                          className="hidden rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground sm:block"
                        >
                          Review now
                        </button>
                      )}
                      <ChevronRight className="text-muted-foreground sm:hidden" size={17} />
                    </div>
                  </div>

                  {reviewing === item.id && (
                    <div className="border-t border-border bg-muted/30 px-4 py-4">
                      <p className="text-xs text-muted-foreground">
                        Rate your recall. The SM-2 algorithm will schedule your next review accordingly.
                      </p>
                      <QualityRater
                        loading={completeMutation.isPending}
                        onRate={(q) => completeMutation.mutate({ problemId: item.id, quality: q })}
                      />
                      {completeMutation.isPending && (
                        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 size={12} className="animate-spin" /> Scheduling next review...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
              <div className="mb-4 rounded-xl bg-muted p-3 text-muted-foreground"><Check size={22} /></div>
              <h3 className="font-semibold">Queue is clear</h3>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                Nice work. Solve more problems — they'll automatically appear here for revision.
              </p>
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-border bg-card p-5">
          <p className="mono text-[10px] uppercase tracking-[.15em] text-accent">Why this order?</p>
          <h3 className="mt-4 font-semibold">SM-2 Algorithm</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your queue uses the SuperMemo SM-2 spaced repetition algorithm. Problems you struggle with are reviewed more frequently; ones you know well get longer intervals.
          </p>
          <div className="mt-5 space-y-3 border-t border-border pt-4">
            {[
              { label: 'Ease factor', value: `${queue[0]?.easeFactor?.toFixed(2) ?? '2.50'}` },
              { label: 'Next interval', value: `${queue[0]?.interval ?? 1} day${(queue[0]?.interval ?? 1) !== 1 ? 's' : ''}` },
              { label: 'Algorithm', value: 'SM-2' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </Page>
  );
}
