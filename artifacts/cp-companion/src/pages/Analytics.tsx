import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from 'recharts';
import { BarChart3, TrendingUp, Target, Layers } from 'lucide-react';
import { api, AnalyticsSummary, HeatmapData } from '../lib/api';
import Page from '../components/layout/Page';

const DIFF_COLORS = { Easy: 'hsl(var(--accent))', Medium: '#d68a1b', Hard: 'hsl(var(--destructive))' };
const PIE_COLORS = ['hsl(var(--accent))', '#d68a1b', 'hsl(var(--destructive))', 'hsl(var(--muted-foreground))'];

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5 md:p-6">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function CalendarHeatmap({ data }: { data: HeatmapData }) {
  const maxCount = Math.max(...data.heatmap.map((d) => d.count), 1);
  const months: string[] = [];
  let lastMonth = '';

  return (
    <div>
      <div className="flex flex-wrap gap-0.5">
        {data.heatmap.map((d) => {
          const intensity = d.count === 0 ? 0 : Math.min(1, d.count / maxCount);
          const opacity = intensity === 0 ? 0.08 : 0.2 + intensity * 0.8;
          return (
            <div
              key={d.date}
              title={`${d.date}: ${d.count} solved`}
              className="h-2.5 w-2.5 rounded-[2px] cursor-default"
              style={{ backgroundColor: `hsla(var(--accent) / ${opacity})` }}
            />
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-[10px] text-muted-foreground">
        <span>1 year ago</span>
        <span className="flex items-center gap-3">
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: 'hsla(var(--accent) / .08)' }} /> Less
          <span className="h-2.5 w-2.5 rounded-[2px]" style={{ backgroundColor: 'hsl(var(--accent))' }} /> More
        </span>
        <span>Today</span>
      </div>
      <div className="mt-3 flex gap-5 text-xs text-muted-foreground">
        <span>Year: <strong className="text-foreground">{data.totalSolvedYear}</strong></span>
        <span>Last month: <strong className="text-foreground">{data.lastMonth}</strong></span>
        <span>Last week: <strong className="text-foreground">{data.lastWeek}</strong></span>
      </div>
    </div>
  );
}

export default function Analytics() {
  const { data: summary, isLoading: summaryLoading } = useQuery<AnalyticsSummary>({
    queryKey: ['analytics-summary'],
    queryFn: () => api.get<AnalyticsSummary>('/analytics/summary'),
    staleTime: 30 * 1000,
  });

  const { data: heatmap } = useQuery<HeatmapData>({
    queryKey: ['analytics-heatmap'],
    queryFn: () => api.get<HeatmapData>('/analytics/heatmap'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: monthly } = useQuery<Array<{ month: string; solved: number }>>({
    queryKey: ['analytics-monthly'],
    queryFn: () => api.get<Array<{ month: string; solved: number }>>('/analytics/monthly'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: topicData } = useQuery<Array<{ name: string; total: number; solved: number; successRate: number }>>({
    queryKey: ['analytics-topics'],
    queryFn: () => api.get('/analytics/topics'),
    staleTime: 5 * 60 * 1000,
  });

  const difficultyData = summary?.difficulty ?? [];

  return (
    <Page
      eyebrow="Performance analytics"
      title="Data-driven insights."
      description="Understand where you're strong and where to focus next."
    >
      {/* Summary stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total solved', value: summary?.solved ?? 0, sub: `of ${summary?.total ?? 0} total`, icon: Target, accent: true },
          { label: 'Success rate', value: `${summary?.successRate ?? 0}%`, sub: 'solved / total', icon: TrendingUp },
          { label: 'Streak', value: `${summary?.currentStreak ?? 0}d`, sub: `best: ${summary?.longestStreak ?? 0} days`, icon: BarChart3 },
          { label: 'This week', value: `${summary?.weeklyCompleted ?? 0}/${summary?.weeklyGoal ?? 10}`, sub: 'toward weekly goal', icon: Layers },
        ].map(({ label, value, sub, icon: Icon, accent }) => (
          <div key={label} className={`rounded-xl border p-5 ${accent ? 'border-accent/30 bg-accent/[.06]' : 'border-border bg-card'}`}>
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
        ))}
      </div>

      {/* Activity heatmap */}
      {heatmap && (
        <Section title="Activity heatmap" sub="365 days of solving activity">
          <CalendarHeatmap data={heatmap} />
        </Section>
      )}

      {/* Charts */}
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <Section title="Monthly progress" sub="Problems solved per month">
          {summaryLoading ? (
            <div className="h-[200px] animate-pulse rounded-lg bg-muted" />
          ) : (
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly ?? []} barCategoryGap="40%">
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }} />
                  <Bar dataKey="solved" radius={[4, 4, 1, 1]} fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Section>

        <Section title="Difficulty breakdown" sub="Distribution across Easy / Medium / Hard">
          <div className="flex items-center gap-5">
            <div className="h-[200px] flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={difficultyData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3}>
                    {difficultyData.map((entry) => (
                      <Cell key={entry.name} fill={DIFF_COLORS[entry.name as keyof typeof DIFF_COLORS] ?? PIE_COLORS[0]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {difficultyData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ background: DIFF_COLORS[d.name as keyof typeof DIFF_COLORS] ?? PIE_COLORS[i] }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-bold">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Section>
      </div>

      {/* Topics analysis */}
      {topicData && topicData.length > 0 && (
        <div className="mt-5">
          <Section title="Topic analysis" sub="Success rate per topic · top 15">
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicData.slice(0, 10)} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} width={90} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }} />
                  <Bar dataKey="total" name="Total" fill="hsl(var(--muted))" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="solved" name="Solved" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>
      )}

      {/* Platform breakdown */}
      {summary?.platforms && summary.platforms.length > 0 && (
        <div className="mt-5">
          <Section title="Platform distribution" sub="Where you practice most">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.platforms} barCategoryGap="35%">
                  <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis hide allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }} />
                  <Bar dataKey="value" radius={[4, 4, 1, 1]} fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Section>
        </div>
      )}
    </Page>
  );
}
