import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Check, Target, Heart, Flame, ChevronRight, Sparkles,
  ExternalLink, AlertCircle
} from 'lucide-react';
import { api, AnalyticsSummary, Problem } from '../lib/api';
import { useAuth } from '../hooks/use-auth';
import Page from '../components/layout/Page';

function Stat({ label, value, sub, icon: Icon, accent = false }: {
  label: string; value: string | number; sub: string;
  icon: React.ElementType; accent?: boolean;
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

function DifficultyDot({ value }: { value: string }) {
  return (
    <span className={`inline-block h-1.5 w-1.5 rounded-full mr-1.5 ${value === 'Easy' ? 'bg-accent' : value === 'Medium' ? 'bg-[#d68a1b]' : 'bg-destructive'}`} />
  );
}

function ProblemMiniRow({ p }: { p: Problem }) {
  return (
    <div className="mb-2 flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:border-accent/40">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold">{p.title}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.difficulty === 'Easy' ? 'bg-accent/10 text-accent' : p.difficulty === 'Medium' ? 'bg-[#d68a1b]/10 text-[#b56d07]' : 'bg-destructive/10 text-destructive'}`}>
            {p.difficulty}
          </span>
        </div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{p.platform}</span>
          {p.topics.length > 0 && <><span className="text-border">/</span><span>{p.topics.slice(0, 2).join(' · ')}</span></>}
        </div>
      </div>
      <div className={`hidden items-center gap-1.5 text-[11px] sm:flex ${p.status === 'Solved' ? 'text-accent' : 'text-muted-foreground'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${p.status === 'Solved' ? 'bg-accent' : 'bg-muted-foreground/40'}`} />
        {p.status}
      </div>
      {p.solutionLink && (
        <a href={p.solutionLink} target="_blank" rel="noreferrer" className="shrink-0 rounded p-1 text-muted-foreground hover:text-accent">
          <ExternalLink size={14} />
        </a>
      )}
    </div>
  );
}

export default function Overview() {
  const { user } = useAuth();
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const { data: analytics, isLoading: analyticsLoading, isError } = useQuery<AnalyticsSummary>({
    queryKey: ['analytics-summary'],
    queryFn: () => api.get<AnalyticsSummary>('/analytics/summary'),
    staleTime: 30 * 1000,
  });

  const { data: recentData, isLoading: problemsLoading } = useQuery<{ problems: Problem[] }>({
    queryKey: ['problems-recent'],
    queryFn: () => api.get<{ problems: Problem[] }>('/problems?limit=5&sortBy=dateAdded&sortOrder=desc'),
    staleTime: 30 * 1000,
  });

  const { data: revisionData } = useQuery<{ stats: { dueToday: number } }>({
    queryKey: ['revision-stats'],
    queryFn: () => api.get<{ queue: []; stats: { dueToday: number; reviewRhythm: number; retention: number } }>('/revision/queue?limit=1'),
    staleTime: 60 * 1000,
  });

  const solved = analytics?.solved ?? 0;
  const total = analytics?.total ?? 0;
  const weeklyCompleted = analytics?.weeklyCompleted ?? 0;
  const weeklyGoal = analytics?.weeklyGoal ?? (user?.weeklyGoal ?? 10);
  const currentStreak = analytics?.currentStreak ?? 0;

  const topTopics = (analytics?.topics ?? []).slice(0, 4);
  const maxTopic = Math.max(...topTopics.map((t) => t.value), 1);

  return (
    <Page
      eyebrow={today}
      title={<>Keep the streak<br /><span className="text-accent">alive.</span></>}
      description="A focused workspace for the problems between you and your next breakthrough."
    >
      {isError && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-[#d68a1b]/30 bg-[#d68a1b]/5 p-3 text-xs text-[#9b5e08]">
          <AlertCircle size={14} /> Unable to load live data. Please check your connection.
        </div>
      )}

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Problems solved" value={solved} sub={`of ${total} in your library`} icon={Check} accent />
        <Stat label="This week" value={`${weeklyCompleted}/${weeklyGoal}`} sub={`${total > 0 ? Math.round((weeklyCompleted / weeklyGoal) * 100) : 0}% of weekly goal`} icon={Target} />
        <Stat label="Favorites" value={analytics?.favorites ?? 0} sub="bookmarked for later" icon={Heart} />
        <Stat label="Current streak" value={`${currentStreak} day${currentStreak !== 1 ? 's' : ''}`} sub={`best: ${analytics?.longestStreak ?? 0} days`} icon={Flame} />
      </div>

      {/* Charts + Next Up */}
      <div className="mt-8 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Weekly momentum</h2>
              <p className="mt-1 text-xs text-muted-foreground">Solved problems · last 7 days</p>
            </div>
            <Link href="/analytics" className="text-xs font-semibold text-accent hover:underline">
              View analytics <ChevronRight className="inline" size={13} />
            </Link>
          </div>
          <div className="mt-6 h-[190px]">
            {analyticsLoading ? (
              <div className="h-full animate-pulse rounded-lg bg-muted" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics?.weeklyActivity ?? []} barCategoryGap="35%">
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }} />
                  <Bar dataKey="solved" radius={[4, 4, 1, 1]} fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-sidebar p-5 text-sidebar-foreground md:p-6">
          <div className="flex items-center gap-2 text-sidebar-primary">
            <Sparkles size={17} />
            <span className="mono text-[10px] font-bold uppercase tracking-[.16em]">Next up</span>
          </div>
          {revisionData?.stats?.dueToday ? (
            <>
              <h2 className="mt-7 text-2xl font-bold tracking-tight">
                Review <span className="text-sidebar-primary">{revisionData.stats.dueToday}</span> problem{revisionData.stats.dueToday !== 1 ? 's' : ''} due today.
              </h2>
              <p className="mt-3 text-sm leading-6 text-sidebar-foreground/55">
                Your revision queue has items due. A focused 25-minute session will make a dent.
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-7 text-2xl font-bold tracking-tight">
                Queue is<br /><span className="text-sidebar-primary">clear!</span>
              </h2>
              <p className="mt-3 text-sm leading-6 text-sidebar-foreground/55">
                No revisions due right now. Keep solving to build your queue.
              </p>
            </>
          )}
          <Link href="/revision" className="mt-7 flex items-center justify-between rounded-lg bg-sidebar-primary px-4 py-3 text-sm font-bold text-sidebar-primary-foreground transition-transform hover:translate-x-1">
            Open revision queue <ChevronRight size={17} />
          </Link>
        </section>
      </div>

      {/* Recent problems + Topics */}
      <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Recent problems</h2>
              <p className="mt-1 text-xs text-muted-foreground">Your latest additions</p>
            </div>
            <Link href="/problems" className="text-xs font-semibold text-accent">
              Browse library <ChevronRight className="inline" size={13} />
            </Link>
          </div>
          {problemsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-[74px] animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : (
            (recentData?.problems ?? []).map((p) => <ProblemMiniRow key={p.id} p={p} />)
          )}
        </section>

        <section>
          <div className="mb-4">
            <h2 className="font-semibold">Focus topics</h2>
            <p className="mt-1 text-xs text-muted-foreground">Where your practice is concentrated</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            {analyticsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />)}
              </div>
            ) : topTopics.length > 0 ? (
              topTopics.map((t) => (
                <div key={t.name} className="mb-4 last:mb-0">
                  <div className="mb-2 flex justify-between text-xs">
                    <span>{t.name}</span>
                    <span className="mono text-muted-foreground">{t.value}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="bar h-full rounded-full bg-accent"
                      style={{ width: `${(t.value / maxTopic) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-xs text-muted-foreground py-8">
                Add problems with topics to see your focus areas
              </p>
            )}
          </div>
        </section>
      </div>
    </Page>
  );
}
