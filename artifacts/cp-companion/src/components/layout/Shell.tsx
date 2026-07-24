import { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import {
  BarChart3, BookOpen, BrainCircuit, ChevronRight, Code2,
  LogOut, Menu, Moon, Search, Settings as SettingsIcon,
  Sun, Trophy, Users, X, LayoutDashboard, Zap, Flame,
} from 'lucide-react';
import { useAuth } from '../../hooks/use-auth';

const NAV = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/problems', label: 'Problem Library', icon: BookOpen },
  { href: '/collaborator', label: 'Collaborator', icon: Users },
  { href: '/contest', label: 'Virtual Contest', icon: Trophy },
  { href: '/revision', label: 'Revision Queue', icon: BrainCircuit },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
];

interface ShellProps {
  children: React.ReactNode;
  revisionDue?: number;
  onSearchOpen?: () => void;
}

export default function Shell({ children, revisionDue = 0, onSearchOpen }: ShellProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem('cp-theme') === 'dark');
  const { user, logout } = useAuth();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('cp-theme', dark ? 'dark' : 'light');
  }, [dark]);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location]);

  // Keyboard shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onSearchOpen?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onSearchOpen]);

  const currentLabel = NAV.find((n) => n.href === location)?.label
    ?? (location === '/settings' ? 'Settings' : location.slice(1));

  return (
    <div className="grain min-h-[100dvh] bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[256px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Logo */}
        <div className="flex h-[76px] items-center border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Code2 size={20} />
          </div>
          <div className="ml-3">
            <div className="font-bold tracking-tight">CP Companion</div>
            <div className="mono text-[9px] uppercase tracking-[.2em] opacity-50">practice system</div>
          </div>
          <button
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded p-1 hover:bg-sidebar-accent md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 pt-7">
          <p className="mono mb-3 px-3 text-[10px] uppercase tracking-[.16em] text-sidebar-foreground/40">
            Workspace
          </p>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location === href;
            return (
              <Link
                key={href}
                href={href}
                className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${active
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
                  }`}
              >
                <Icon size={17} strokeWidth={active ? 2.3 : 1.8} />
                <span>{label}</span>
                {href === '/revision' && revisionDue > 0 && (
                  <span className="mono ml-auto rounded-full bg-accent/20 px-1.5 py-0.5 text-[9px] text-accent">
                    {revisionDue}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: settings + user */}
        <div className="border-t border-sidebar-border p-4">
          <Link
            href="/settings"
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${location === '/settings' ? 'bg-sidebar-accent' : 'text-sidebar-foreground/60 hover:bg-sidebar-accent'}`}
          >
            <SettingsIcon size={17} />
            <span>Settings</span>
          </Link>
          {user && (
            <div className="mt-3 flex items-center gap-3 rounded-lg bg-sidebar-accent/60 p-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-semibold">{user.name}</div>
                <div className="truncate text-[10px] text-sidebar-foreground/45">{user.email}</div>
              </div>
              <button
                aria-label="Sign out"
                onClick={() => logout()}
                className="ml-auto rounded p-1 opacity-50 hover:opacity-100"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-sidebar/30 md:hidden"
        />
      )}

      {/* Main content */}
      <main className="min-h-[100dvh] md:pl-[256px]">
        {/* Top header */}
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur md:px-10">
          <button
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 hover:bg-muted md:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            <span className="mono text-[10px] text-accent">~/cp</span>
            <ChevronRight size={13} />
            <span>{currentLabel.toLowerCase()}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              aria-label="Toggle theme"
              onClick={() => setDark(!dark)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <div className="hidden h-7 w-px bg-border sm:block" />
            <button
              onClick={onSearchOpen}
              className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground hover:border-accent"
            >
              <Search size={14} />
              <span className="hidden sm:inline">Quick search</span>
              <kbd className="mono hidden rounded bg-muted px-1.5 py-0.5 text-[9px] sm:inline">⌘ K</kbd>
            </button>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
