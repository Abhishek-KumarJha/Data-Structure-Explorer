import { useState, FormEvent } from 'react';
import { Code2, LogIn, Plus, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';

export default function Login() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'signin' | 'create'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (mode === 'create' && name.trim().length < 2) {
      setError('Name must be at least 2 characters.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'create') {
        await register(name.trim(), email.trim(), password);
      } else {
        await login(email.trim(), password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grain flex min-h-[100dvh] items-center justify-center bg-sidebar px-5 py-10 text-sidebar-foreground">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-sidebar-border bg-sidebar-accent shadow-2xl md:grid-cols-[.9fr_1.1fr]">
        {/* Left panel */}
        <div className="hidden flex-col justify-between bg-sidebar-primary p-10 text-sidebar-primary-foreground md:flex">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sidebar-primary-foreground/15">
              <Code2 size={23} />
            </div>
            <p className="mono mt-5 text-[10px] uppercase tracking-[.2em] opacity-75">CP Companion</p>
            <h1 className="mt-8 text-4xl font-bold leading-tight tracking-[-.05em]">
              Practice with<br />intent.
            </h1>
            <p className="mt-4 max-w-xs text-sm leading-6 opacity-75">
              A focused workspace for competitive programming practice — track problems, schedule revisions, and run virtual contests.
            </p>
          </div>
          <div className="space-y-2">
            {['Problem Library', 'Smart Revision Queue', 'Virtual Contests', 'Live Analytics'].map((feat) => (
              <p key={feat} className="flex items-center gap-2 text-xs opacity-70">
                <span className="h-1 w-1 rounded-full bg-sidebar-primary-foreground/70" />
                {feat}
              </p>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div className="bg-card p-7 text-foreground sm:p-10">
          <div className="flex items-center gap-3 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Code2 size={19} />
            </div>
            <span className="font-bold">CP Companion</span>
          </div>

          <p className="mono mt-8 text-[10px] font-bold uppercase tracking-[.18em] text-accent md:mt-0">
            {mode === 'signin' ? 'Welcome back' : 'Get started'}
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-[-.04em]">
            {mode === 'signin' ? 'Pick up where you left off.' : 'Create your account.'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {mode === 'signin'
              ? 'Your practice data is stored securely in the cloud.'
              : 'Start tracking your competitive programming journey.'}
          </p>

          {/* Mode toggle */}
          <div className="mt-7 flex rounded-lg bg-muted p-1">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(''); }}
              className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${mode === 'signin' ? 'bg-card shadow-sm' : ''}`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => { setMode('create'); setError(''); }}
              className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${mode === 'create' ? 'bg-card shadow-sm' : ''}`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'create' && (
              <label className="block text-xs font-semibold">
                Full name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent"
                />
              </label>
            )}

            <label className="block text-xs font-semibold">
              Email address
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="mt-2 h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-accent"
              />
            </label>

            <label className="block text-xs font-semibold">
              Password
              <div className="relative mt-2">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'create' ? 'At least 6 characters' : 'Your password'}
                  autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                  className="h-11 w-full rounded-lg border border-input bg-background px-3 pr-10 text-sm outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            {error && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : mode === 'signin' ? (
                <LogIn size={16} />
              ) : (
                <Plus size={16} />
              )}
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-center text-[11px] text-muted-foreground">
            Your data is stored securely. Passwords are bcrypt-hashed.
          </p>
        </div>
      </div>
    </div>
  );
}
