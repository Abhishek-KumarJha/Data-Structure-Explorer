import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon, User, Target, Moon, Sun, Loader2, X,
  Download, Upload, Trash2, AlertCircle, CheckCircle2, Clock,
  FileJson, FileSpreadsheet, History
} from 'lucide-react';
import { api, ImportExportHistoryItem } from '../lib/api';
import { useAuth } from '../hooks/use-auth';
import Page from '../components/layout/Page';

function Section({ icon: Icon, title, description, children }: {
  icon: React.ElementType; title: string; description: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-muted p-2 text-muted-foreground"><Icon size={18} /></div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-5 border-t border-border pt-5">{children}</div>
    </div>
  );
}

export default function Settings() {
  const { user, updateProfile, logout } = useAuth();
  const qc = useQueryClient();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [weeklyGoal, setWeeklyGoal] = useState(user?.weeklyGoal ?? 10);
  const [dark, setDark] = useState(document.documentElement.classList.contains('dark'));
  const [resetConfirm, setResetConfirm] = useState(false);

  const [profileMsg, setProfileMsg] = useState('');
  const importFileRef = useRef<HTMLInputElement>(null);

  const profileMutation = useMutation({
    mutationFn: () => updateProfile({ name, email, weeklyGoal, theme: dark ? 'dark' : 'light' }),
    onSuccess: () => { setProfileMsg('Saved!'); setTimeout(() => setProfileMsg(''), 2500); },
    onError: (e) => setProfileMsg(e.message),
  });

  const resetMutation = useMutation({
    mutationFn: () => api.post('/settings/reset', {}),
    onSuccess: () => { qc.invalidateQueries(); setResetConfirm(false); logout(); },
  });

  const { data: importHistory } = useQuery<ImportExportHistoryItem[]>({
    queryKey: ['import-export-history'],
    queryFn: () => api.get<ImportExportHistoryItem[]>('/import-export/history'),
    staleTime: 30 * 1000,
  });

  const handleExport = async (format: 'json' | 'csv') => {
    const url = `${import.meta.env.VITE_API_URL ?? ''}/api/export/${format}`;
    const token = localStorage.getItem('cp-jwt');
    const res = await fetch(url, { credentials: 'include', headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cp-companion-export-${new Date().toISOString().slice(0, 10)}.${format}`;
    a.click();
    qc.invalidateQueries({ queryKey: ['import-export-history'] });
  };

  const handleImport = useCallback(async (file: File) => {
    if (file.name.endsWith('.json')) {
      const text = await file.text();
      const problems = JSON.parse(text);
      const result = await api.post<{ imported: number; duplicatesSkipped: number }>('/import/json', { problems, mode: 'append' });
      qc.invalidateQueries({ queryKey: ['problems'] });
      alert(`Imported ${result.imported} problems. ${result.duplicatesSkipped} duplicates skipped.`);
    } else if (file.name.endsWith('.csv')) {
      const csv = await file.text();
      const result = await api.post<{ imported: number; duplicatesSkipped: number }>('/import/csv', { csv, mode: 'append' });
      qc.invalidateQueries({ queryKey: ['problems'] });
      alert(`Imported ${result.imported} problems. ${result.duplicatesSkipped} duplicates skipped.`);
    } else {
      alert('Only .json and .csv files are supported.');
    }
    qc.invalidateQueries({ queryKey: ['import-export-history'] });
  }, [qc]);

  return (
    <Page eyebrow="Settings" title="Preferences.">
      <div className="max-w-2xl space-y-5">
        {/* Profile */}
        <Section icon={User} title="Profile" description="Update your name, email, and practice goal">
          <div className="space-y-4">
            <label className="block text-xs font-semibold">
              Full name
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent" />
            </label>
            <label className="block text-xs font-semibold">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent" />
            </label>
            <label className="block text-xs font-semibold">
              Weekly goal (problems to solve)
              <input type="number" min={1} max={100} value={weeklyGoal} onChange={(e) => setWeeklyGoal(Number(e.target.value))}
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent" />
            </label>
            <div className="flex items-center justify-between">
              {profileMsg && (
                <span className="flex items-center gap-1 text-xs text-accent">
                  <CheckCircle2 size={13} /> {profileMsg}
                </span>
              )}
              <button
                onClick={() => profileMutation.mutate()}
                disabled={profileMutation.isPending}
                className="ml-auto flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {profileMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Save changes
              </button>
            </div>
          </div>
        </Section>

        {/* Appearance */}
        <Section icon={dark ? Moon : Sun} title="Appearance" description="Choose your preferred theme">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{dark ? 'Dark mode' : 'Light mode'}</p>
              <p className="text-xs text-muted-foreground">Switch between light and dark themes</p>
            </div>
            <button
              onClick={() => {
                const d = !dark;
                setDark(d);
                document.documentElement.classList.toggle('dark', d);
                localStorage.setItem('cp-theme', d ? 'dark' : 'light');
              }}
              className={`flex h-8 w-14 items-center rounded-full px-1 transition-colors ${dark ? 'bg-accent' : 'bg-muted'}`}
            >
              <div className={`h-6 w-6 rounded-full bg-white shadow transition-transform ${dark ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </Section>

        {/* Export */}
        <Section icon={Download} title="Export data" description="Download your problem library as JSON or CSV">
          <div className="flex gap-3">
            <button onClick={() => handleExport('json')}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-semibold hover:border-accent">
              <FileJson size={16} /> Export JSON
            </button>
            <button onClick={() => handleExport('csv')}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border py-2.5 text-sm font-semibold hover:border-accent">
              <FileSpreadsheet size={16} /> Export CSV
            </button>
          </div>
        </Section>

        {/* Import */}
        <Section icon={Upload} title="Import data" description="Import problems from a JSON or CSV file (exported from CP Companion)">
          <div>
            <button
              onClick={() => importFileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 py-8 text-sm font-semibold hover:border-accent"
            >
              <Upload size={18} /> Click to select file (.json or .csv)
            </button>
            <input
              ref={importFileRef}
              type="file"
              accept=".json,.csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
            />
          </div>

          {/* Import/export history */}
          {importHistory && importHistory.length > 0 && (
            <div className="mt-5">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <History size={13} /> Recent activity
              </p>
              <div className="space-y-1.5">
                {importHistory.slice(0, 5).map((h) => (
                  <div key={h.id} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
                    {h.type === 'import' ? <Upload size={13} className="text-accent" /> : <Download size={13} className="text-muted-foreground" />}
                    <span className="flex-1 text-xs capitalize">{h.type} · {h.format.toUpperCase()}</span>
                    <span className="mono text-[10px] text-muted-foreground">{h.recordCount} records</span>
                    <span className="mono text-[10px] text-muted-foreground">
                      {new Date(h.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Danger zone */}
        <Section icon={Trash2} title="Danger zone" description="Irreversible actions — proceed with caution">
          {!resetConfirm ? (
            <button
              onClick={() => setResetConfirm(true)}
              className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-sm font-semibold text-destructive hover:bg-destructive/10"
            >
              <AlertCircle size={16} /> Reset all data
            </button>
          ) : (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-semibold text-destructive">Are you absolutely sure?</p>
              <p className="mt-1 text-xs text-muted-foreground">
                This will permanently delete all your problems, contests, revision queue, and notes. This cannot be undone.
              </p>
              <div className="mt-4 flex gap-3">
                <button onClick={() => setResetConfirm(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">Cancel</button>
                <button
                  onClick={() => resetMutation.mutate()}
                  disabled={resetMutation.isPending}
                  className="flex items-center gap-2 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {resetMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Yes, reset everything
                </button>
              </div>
            </div>
          )}
        </Section>
      </div>
    </Page>
  );
}
