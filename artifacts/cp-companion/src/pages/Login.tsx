import { useState, FormEvent, useEffect } from "react";
import {
  ArrowRight,
  ArrowUp,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Code2,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Layers,
  Loader2,
  Lock,
  Mail,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  Timer,
  Trophy,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useAuth } from "../hooks/use-auth";
import { useLocation } from "wouter";

export default function Login() {
  const { login, register } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<"create" | "signin">("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  // Theme state: dark by default, persists in localStorage
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cp-theme");
      if (saved) return saved === "dark";
      return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true;
    }
    return true;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("cp-theme", dark ? "dark" : "light");
  }, [dark]);

  // Track active section for navigation highlight
  useEffect(() => {
    const handleScroll = () => {
      const sections = ["features", "problems", "contests", "about"];
      const scrollPosition = window.scrollY + 180;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            return;
          }
        }
      }
      if (window.scrollY < 200) {
        setActiveSection("");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "create" && name.trim().length < 2) {
      setError("Name must be at least 2 characters.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "create") {
        await register(name.trim(), email.trim(), password);
        setLocation("/");
      } else {
        await login(email.trim(), password);
        setLocation("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async () => {
    setError("");
    setLoading(true);
    try {
      await login("test@example.com", "password123");
      setLocation("/");
    } catch (err) {
      // If login failed, prefill and switch to signin
      setEmail("test@example.com");
      setPassword("password123");
      setMode("signin");
      setError(err instanceof Error ? err.message : "Demo account error. Try signing in.");
    } finally {
      setLoading(false);
    }
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#f8fafc] text-slate-800 transition-colors duration-200 selection:bg-emerald-500 selection:text-slate-950 dark:bg-[#060c18] dark:text-slate-100">
      {/* ─── Ambient Glow & Mesh Background ───────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Soft emerald ambient glow */}
        <div className="absolute -left-32 -top-32 h-[550px] w-[550px] rounded-full bg-emerald-500/10 blur-[130px] dark:bg-emerald-500/12" />
        {/* Cyan center ambient glow */}
        <div className="absolute left-1/3 top-1/4 h-[450px] w-[450px] rounded-full bg-cyan-500/10 blur-[140px] dark:bg-cyan-500/10" />
        {/* Deep blue/indigo right ambient glow */}
        <div className="absolute right-0 top-1/4 h-[550px] w-[550px] rounded-full bg-indigo-500/8 blur-[150px] dark:bg-blue-600/10" />
        {/* Bottom horizon lighting */}
        <div className="absolute -bottom-24 left-1/4 h-[400px] w-[650px] rounded-full bg-emerald-500/8 blur-[140px] dark:bg-emerald-500/10" />

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Mountain Silhouette Layers at Bottom */}
        <svg
          className="absolute bottom-0 left-0 w-full opacity-20 dark:opacity-30"
          viewBox="0 0 1440 220"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 220L120 180L280 205L440 160L600 195L760 150L920 185L1080 140L1240 175L1440 130V220H0Z"
            className="fill-slate-300 dark:fill-[#020617]"
          />
          <path
            d="M0 220L180 195L360 170L540 200L720 165L900 190L1080 155L1260 185L1440 160V220H0Z"
            className="fill-slate-200 dark:fill-[#081426]"
            opacity="0.7"
          />
        </svg>
      </div>

      {/* ─── Sticky Navigation Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl transition-colors dark:border-slate-800/80 dark:bg-[#060c18]/85">
        <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-10">
          {/* Logo */}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="group flex items-center gap-2.5 outline-none"
            aria-label="CP Companion Home"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-transform group-hover:scale-105">
              <span className="font-mono text-lg font-bold text-slate-950">
                &lt;/&gt;
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 font-bold tracking-tight">
              <span className="text-xl text-slate-900 dark:text-white">CP</span>
              <span className="text-xl text-emerald-600 drop-shadow-[0_0_12px_rgba(16,185,129,0.25)] dark:text-[#00ff9d] dark:drop-shadow-[0_0_14px_rgba(0,255,157,0.45)]">
                COMPANION
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main Navigation">
            <a
              href="#features"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("features");
              }}
              className={`text-sm font-medium transition-colors ${
                activeSection === "features"
                  ? "text-emerald-600 dark:text-[#00ff9d]"
                  : "text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-[#00ff9d]"
              }`}
            >
              Features
            </a>
            <a
              href="#problems"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("problems");
              }}
              className={`text-sm font-medium transition-colors ${
                activeSection === "problems"
                  ? "text-emerald-600 dark:text-[#00ff9d]"
                  : "text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-[#00ff9d]"
              }`}
            >
              Problems
            </a>
            <a
              href="#contests"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("contests");
              }}
              className={`text-sm font-medium transition-colors ${
                activeSection === "contests"
                  ? "text-emerald-600 dark:text-[#00ff9d]"
                  : "text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-[#00ff9d]"
              }`}
            >
              Contests
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                scrollToSection("about");
              }}
              className={`text-sm font-medium transition-colors ${
                activeSection === "about"
                  ? "text-emerald-600 dark:text-[#00ff9d]"
                  : "text-slate-600 hover:text-emerald-600 dark:text-slate-300 dark:hover:text-[#00ff9d]"
              }`}
            >
              About
            </a>
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setDark(!dark)}
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              aria-pressed={dark}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300/80 bg-slate-100 text-slate-700 shadow-sm transition-all hover:border-emerald-500 hover:text-emerald-600 dark:border-slate-700/60 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-emerald-500/60 dark:hover:text-white"
            >
              {dark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
            </button>

            {/* Jump to Auth Card Button (Desktop) */}
            <button
              type="button"
              onClick={() => scrollToSection("auth-card")}
              className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-95 sm:flex dark:from-emerald-400 dark:to-teal-500 dark:text-slate-950 dark:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
            >
              <span>Get Started</span>
              <ArrowRight size={14} strokeWidth={2.5} />
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-slate-100 text-slate-700 transition-colors md:hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur-xl md:hidden dark:border-slate-800 dark:bg-[#070e1c]/95">
            <nav className="flex flex-col space-y-3" aria-label="Mobile Navigation">
              <button
                type="button"
                onClick={() => scrollToSection("features")}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60"
              >
                <span>Features</span>
                <ChevronRightIcon />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("problems")}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60"
              >
                <span>Problems</span>
                <ChevronRightIcon />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("contests")}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60"
              >
                <span>Contests</span>
                <ChevronRightIcon />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("about")}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800/60"
              >
                <span>About</span>
                <ChevronRightIcon />
              </button>
              <button
                type="button"
                onClick={() => scrollToSection("auth-card")}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-center text-sm font-bold text-white shadow-md dark:bg-emerald-400 dark:text-slate-950"
              >
                <span>Create Account / Sign In</span>
                <ArrowRight size={16} />
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* ─── Main Content Container ────────────────────────────────────────── */}
      <main className="relative z-10 mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-10">
        {/* ══════════════════════════════════════════════════════════════════════
            HERO SECTION: 2-COLUMN VIEWPORT (Hero Content + Auth Card)
           ══════════════════════════════════════════════════════════════════════ */}
        <section
          aria-label="Welcome to CP Companion"
          className="grid min-h-[calc(100svh-5rem)] items-start gap-8 pb-12 pt-4 lg:grid-cols-[1.12fr_0.88fr] lg:gap-10 xl:gap-14"
        >
          {/* ════════ LEFT COLUMN: HERO & VISUAL ════════ */}
          <div className="flex flex-col space-y-6 pt-2">
            {/* Hero Heading & Badge */}
            <div className="space-y-4">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur-md dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-400 dark:shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <Sparkles size={14} className="animate-pulse text-emerald-600 dark:text-emerald-300" />
                <span>Level up your problem solving skills</span>
              </div>

              {/* Big Heading */}
              <h1 className="text-4xl font-extrabold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl lg:text-[54px] xl:text-[60px] dark:text-white">
                Practice with
                <br />
                Purpose.
                <br />
                <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 dark:drop-shadow-[0_0_25px_rgba(16,185,129,0.35)]">
                  Grow with Data.
                </span>
              </h1>

              {/* Description */}
              <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
                A focused workspace for competitive programming practice — track
                problems, schedule revisions, participate in virtual contests,
                and analyze your progress.
              </p>
            </div>

            {/* 4 Feature Cards (Interactive Shortcuts) */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* Problem Library */}
              <button
                type="button"
                onClick={() => scrollToSection("problems")}
                className="group flex flex-col items-center rounded-2xl border border-slate-200 bg-white/80 p-3 text-center shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-md dark:border-slate-700/50 dark:bg-[#0a1528]/70 dark:hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 transition-transform group-hover:scale-110 dark:text-blue-400">
                  <FileText size={20} />
                </div>
                <span className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Problem
                  <br />
                  Library
                </span>
              </button>

              {/* Smart Revision */}
              <button
                type="button"
                onClick={() => scrollToSection("features")}
                className="group flex flex-col items-center rounded-2xl border border-slate-200 bg-white/80 p-3 text-center shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-md dark:border-slate-700/50 dark:bg-[#0a1528]/70 dark:hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 transition-transform group-hover:scale-110 dark:text-emerald-400">
                  <Calendar size={20} />
                </div>
                <span className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Smart
                  <br />
                  Revision
                </span>
              </button>

              {/* Virtual Contests */}
              <button
                type="button"
                onClick={() => scrollToSection("contests")}
                className="group flex flex-col items-center rounded-2xl border border-slate-200 bg-white/80 p-3 text-center shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-md dark:border-slate-700/50 dark:bg-[#0a1528]/70 dark:hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 transition-transform group-hover:scale-110 dark:text-amber-400">
                  <Trophy size={20} />
                </div>
                <span className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Virtual
                  <br />
                  Contests
                </span>
              </button>

              {/* Live Analytics */}
              <button
                type="button"
                onClick={() => scrollToSection("features")}
                className="group flex flex-col items-center rounded-2xl border border-slate-200 bg-white/80 p-3 text-center shadow-sm backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-md dark:border-slate-700/50 dark:bg-[#0a1528]/70 dark:hover:shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-500/15 text-teal-600 transition-transform group-hover:scale-110 dark:text-teal-400">
                  <BarChart3 size={20} />
                </div>
                <span className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Live
                  <br />
                  Analytics
                </span>
              </button>
            </div>

            {/* ─── Hero Illustration & Floating Cards ─────────────────────── */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-2 shadow-xl backdrop-blur-xl dark:border-slate-700/60 dark:bg-[#081224]/80 dark:shadow-2xl">
              <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-900">
                <img
                  src="/hero-coder.jpg"
                  alt="Developer working on competitive programming at workstation"
                  className="h-full w-full object-cover object-center transition-transform duration-700 hover:scale-105"
                  loading="eager"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

                {/* Floating Quote Card */}
                <div className="absolute left-4 top-4 max-w-[210px] rounded-xl border border-emerald-500/30 bg-[#09152a]/90 p-3 shadow-xl backdrop-blur-md sm:left-6 sm:top-6">
                  <p className="font-mono text-[11px] leading-snug text-slate-100">
                    &ldquo;Consistency today, results tomorrow.&rdquo;
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5 text-[9px] font-semibold text-[#00ff9d]">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>Daily Practice Loop</span>
                  </div>
                </div>

                {/* Floating Checklist Card */}
                <div className="absolute right-4 top-4 hidden w-[145px] rounded-xl border border-emerald-500/35 bg-[#09152a]/90 p-3 shadow-xl backdrop-blur-md sm:block">
                  <div className="space-y-1.5 text-[11px] font-medium text-slate-200">
                    {["Solve", "Learn", "Revise", "Compete", "Improve"].map(
                      (item) => (
                        <div key={item} className="flex items-center gap-1.5">
                          <div className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500/25 text-emerald-400">
                            <Check size={10} strokeWidth={3} />
                          </div>
                          <span>{item}</span>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {/* Floating Mini Chart Card */}
                <div className="absolute bottom-4 right-4 hidden items-end gap-1 rounded-xl border border-cyan-500/30 bg-[#09152a]/85 p-2.5 shadow-xl backdrop-blur-md md:flex">
                  <span className="h-4 w-1.5 rounded-full bg-emerald-500/40" />
                  <span className="h-6 w-1.5 rounded-full bg-emerald-500/60" />
                  <span className="h-8 w-1.5 rounded-full bg-emerald-400" />
                  <span className="h-5 w-1.5 rounded-full bg-emerald-500/70" />
                  <span className="h-10 w-1.5 rounded-full bg-[#00ff9d]" />
                  <span className="ml-1 font-mono text-[10px] font-semibold text-emerald-300">
                    +120%
                  </span>
                </div>
              </div>
            </div>

            {/* ─── Statistics Card ────────────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-md backdrop-blur-xl sm:p-5 dark:border-slate-700/60 dark:bg-[#0a1528]/80 dark:shadow-xl">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:divide-x sm:divide-slate-200 dark:sm:divide-slate-800">
                <div className="flex items-center gap-3 sm:px-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
                    <Users size={18} />
                  </div>
                  <div>
                    <div className="font-mono text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
                      10K+
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Active Learners
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:px-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                    <Code2 size={18} />
                  </div>
                  <div>
                    <div className="font-mono text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
                      5K+
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Problems
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:px-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Trophy size={18} />
                  </div>
                  <div>
                    <div className="font-mono text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
                      500+
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Virtual Contests
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:px-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <Zap size={18} />
                  </div>
                  <div>
                    <div className="font-mono text-lg font-bold text-slate-900 sm:text-xl dark:text-white">
                      Track
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Your Progress
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Quote & Dot Matrix */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div>
                <p className="font-mono text-xs italic text-slate-600 dark:text-slate-400">
                  &ldquo;A problem a day keeps the easy problems away.&rdquo;
                </p>
                <p className="font-mono text-[10px] tracking-wider text-slate-500 dark:text-slate-500">
                  — CP COMPANION
                </p>
              </div>

              {/* Decorative dot matrix */}
              <div className="hidden grid-cols-6 gap-1.5 opacity-30 sm:grid">
                {Array.from({ length: 18 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-1 w-1 rounded-full bg-emerald-500 dark:bg-emerald-400"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ════════ RIGHT COLUMN: REGISTRATION / AUTH CARD ════════ */}
          <div id="auth-card" className="relative scroll-mt-28">
            {/* Top Right Doodle Annotation */}
            <div className="absolute -top-12 right-2 hidden flex-col items-end xl:flex">
              <span className="font-mono text-xs font-semibold leading-tight text-emerald-600 drop-shadow-sm dark:text-[#00ff9d] dark:drop-shadow-[0_0_8px_rgba(0,255,157,0.5)]">
                Better Coders
                <br />
                Brighter Futures
              </span>
              <svg
                width="34"
                height="28"
                viewBox="0 0 34 28"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="mt-0.5 text-emerald-600 dark:text-[#00ff9d]"
              >
                <path
                  d="M4 2C14 6 26 10 28 22M28 22L20 21M28 22L29 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Glassmorphic Auth Card Container */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-2xl sm:p-8 dark:border-slate-700/70 dark:bg-[#0c162d]/85 dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
              {/* Subtle top edge neon highlight */}
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-80" />

              {/* Category label */}
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-emerald-600 dark:text-[#00ff9d]">
                {mode === "create" ? "GET STARTED" : "WELCOME BACK"}
              </p>

              {/* Card Title */}
              <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                {mode === "create" ? "Create your account" : "Sign in to CP Companion"}
              </h2>

              {/* Supporting text */}
              <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm dark:text-slate-400">
                {mode === "create"
                  ? "Start tracking your competitive programming journey today and join a growing community of problem solvers."
                  : "Welcome back! Pick up your revision schedule, track problems, and join upcoming contests."}
              </p>

              {/* Mode Switch Tabs */}
              <div className="mt-5 grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setMode("create");
                    setError("");
                  }}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                    mode === "create"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-emerald-500 dark:text-slate-950"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Create Account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError("");
                  }}
                  className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                    mode === "signin"
                      ? "bg-white text-slate-900 shadow-sm dark:bg-emerald-500 dark:text-slate-950"
                      : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                  }`}
                >
                  Sign In
                </button>
              </div>

              {/* Quick Demo Access Button */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleQuickDemo}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 px-3 text-xs font-semibold text-emerald-700 transition-all hover:bg-emerald-500/20 active:scale-[0.99] dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-900/40"
                >
                  <Zap size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <span>⚡ Instant Demo Access (Pre-configured Test User)</span>
                </button>
              </div>

              {/* Or separator */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-700/60" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 font-mono text-slate-500 dark:bg-[#0c162d]">
                    or continue with email
                  </span>
                </div>
              </div>

              {/* Auth Form */}
              <form onSubmit={submit} className="space-y-3.5">
                {mode === "create" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Full name
                    </label>
                    <div className="relative mt-1.5">
                      <User
                        size={16}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                      />
                      <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your full name"
                        autoComplete="name"
                        className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700/80 dark:bg-[#070e1c]/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/30"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email address
                  </label>
                  <div className="relative mt-1.5">
                    <Mail
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700/80 dark:bg-[#070e1c]/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <div className="relative mt-1.5">
                    <Lock
                      size={16}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                    />
                    <input
                      type={showPw ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      autoComplete={
                        mode === "create" ? "new-password" : "current-password"
                      }
                      className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50/70 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700/80 dark:bg-[#070e1c]/80 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-emerald-400 dark:focus:ring-emerald-400/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                      aria-label="Toggle password visibility"
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-600 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-400">
                    {error}
                  </p>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading || !email.trim() || !password}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-500 py-3.5 px-4 text-sm font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-50 dark:from-emerald-400 dark:via-emerald-500 dark:to-teal-400 dark:text-slate-950 dark:shadow-[0_0_25px_rgba(16,185,129,0.35)]"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <span>
                        {mode === "create" ? "+ Create account" : "Sign in"}
                      </span>
                      <ArrowRight size={16} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </form>

              {/* Mode switch link */}
              <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
                {mode === "create" ? (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("signin");
                        setError("");
                      }}
                      className="font-semibold text-emerald-600 hover:underline dark:text-[#00ff9d]"
                    >
                      Sign in
                    </button>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        setMode("create");
                        setError("");
                      }}
                      className="font-semibold text-emerald-600 hover:underline dark:text-[#00ff9d]"
                    >
                      Create account
                    </button>
                  </>
                )}
              </div>

              {/* Security / Community trust badges */}
              <div className="mt-6 flex flex-wrap items-center justify-between border-t border-slate-200 pt-4 text-[11px] text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-500 dark:text-emerald-400" />
                  <span>Your data is secure</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users size={14} className="text-cyan-600 dark:text-cyan-400" />
                  <span>Join a great community</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-500 dark:text-amber-400" />
                  <span>Start solving instantly</span>
                </div>
              </div>
            </div>

            {/* Bottom Right Doodle Annotation */}
            <div className="mt-3 flex justify-end px-3">
              <div className="flex flex-col items-end text-right font-mono text-[11px] font-semibold leading-tight text-emerald-600 drop-shadow-sm dark:text-[#00ff9d] dark:drop-shadow-[0_0_8px_rgba(0,255,157,0.4)]">
                <span>Small</span>
                <span>Steps</span>
                <span>Big</span>
                <span>Progress</span>
                <span className="text-xs">⤹</span>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION A — FEATURES (id="features")
           ══════════════════════════════════════════════════════════════════════ */}
        <section
          id="features"
          aria-labelledby="features-heading"
          className="scroll-mt-28 border-t border-slate-200/80 py-16 dark:border-slate-800/80"
        >
          <div className="text-center">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-[#00ff9d]">
              CORE CAPABILITIES
            </span>
            <h2
              id="features-heading"
              className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white"
            >
              Everything You Need to Master Problem Solving
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
              Designed around the cognitive science of retention and deliberate practice.
              CP Companion replaces chaotic bookmarks and scattered spreadsheets.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Problem Library */}
            <div className="group rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-blue-500/50 hover:shadow-xl dark:border-slate-800 dark:bg-[#0a1528]/80 dark:hover:shadow-[0_0_30px_rgba(59,130,246,0.15)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                <FileText size={24} />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
                Problem Library
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Consolidate problems from Codeforces, LeetCode, and AtCoder with automated rating tags, custom status tags, and instant full-text search.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-[10px] text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  Tag Taxonomy
                </span>
                <span className="rounded-md bg-blue-50 px-2 py-0.5 font-mono text-[10px] text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                  Rating Tiers
                </span>
              </div>
              <button
                type="button"
                onClick={() => scrollToSection("problems")}
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <span>Explore problem system</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Card 2: Smart Revision */}
            <div className="group rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-500/50 hover:shadow-xl dark:border-slate-800 dark:bg-[#0a1528]/80 dark:hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                <Calendar size={24} />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
                Smart Revision
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Never forget an ingenious trick or data structure invariant. Our spaced repetition scheduler prompts you at the exact forgetting threshold.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[10px] text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  SM-2 Intervals
                </span>
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[10px] text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  Confidence Score
                </span>
              </div>
              <button
                type="button"
                onClick={() => scrollToSection("auth-card")}
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                <span>Setup revision queue</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Card 3: Virtual Contests */}
            <div className="group rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-amber-500/50 hover:shadow-xl dark:border-slate-800 dark:bg-[#0a1528]/80 dark:hover:shadow-[0_0_30px_rgba(245,158,11,0.15)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                <Trophy size={24} />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
                Virtual Contests
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Practice under realistic time pressure with customized problem pools, countdown timers, penalty tracking, and post-contest upsolving.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-amber-50 px-2 py-0.5 font-mono text-[10px] text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  Live Clock
                </span>
                <span className="rounded-md bg-amber-50 px-2 py-0.5 font-mono text-[10px] text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                  Penalty Scoring
                </span>
              </div>
              <button
                type="button"
                onClick={() => scrollToSection("contests")}
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
              >
                <span>View contest details</span>
                <ArrowRight size={13} />
              </button>
            </div>

            {/* Card 4: Live Analytics */}
            <div className="group rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-teal-500/50 hover:shadow-xl dark:border-slate-800 dark:bg-[#0a1528]/80 dark:hover:shadow-[0_0_30px_rgba(20,184,166,0.15)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400">
                <BarChart3 size={24} />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900 dark:text-white">
                Live Analytics
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Identify your weaknesses with topic radar charts, solved problem heatmaps, practice streak counters, and projected rating curves.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-teal-50 px-2 py-0.5 font-mono text-[10px] text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                  Tag Heatmaps
                </span>
                <span className="rounded-md bg-teal-50 px-2 py-0.5 font-mono text-[10px] text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                  Speed Metrics
                </span>
              </div>
              <button
                type="button"
                onClick={() => scrollToSection("auth-card")}
                className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 dark:hover:text-teal-300"
              >
                <span>Discover insights</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION B — PROBLEMS (id="problems")
           ══════════════════════════════════════════════════════════════════════ */}
        <section
          id="problems"
          aria-labelledby="problems-heading"
          className="scroll-mt-28 border-t border-slate-200/80 py-16 dark:border-slate-800/80"
        >
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Left Column: Description & Value Props */}
            <div className="space-y-6">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-[#00ff9d]">
                  SYSTEMATIC REPOSITORY
                </span>
                <h2
                  id="problems-heading"
                  className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white"
                >
                  Track, Filter, and Conquer Every Problem
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
                  Stop losing track of which problems you solved, which you struggled with, and which require spaced revision.
                  CP Companion gives you a centralized command center.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Track Coding Problems Across Platforms
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      Import and record problem IDs, direct problem links, and personal editorial notes.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                    <Filter size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Filter by Difficulty & Topic Tags
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      Filter instantly from 800 to 3500 rating, or zero in on Dynamic Programming, Graphs, and Greedy.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Search size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Fast Search with Instant Autocomplete
                    </h4>
                    <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
                      Search titles, problem IDs, and topics with sub-10ms response times and recent history sync.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleQuickDemo()}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-95 dark:from-emerald-400 dark:to-teal-500 dark:text-slate-950 dark:shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  <Code2 size={16} />
                  <span>Explore Problems in Live Workspace</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Right Column: Interactive Problem Explorer Card Mockup */}
            <div className="rounded-3xl border border-slate-200/90 bg-white/95 p-6 shadow-xl backdrop-blur-2xl dark:border-slate-800 dark:bg-[#0c162d]/90">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500/80" />
                  <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <span className="h-3 w-3 rounded-full bg-green-500/80" />
                  <span className="ml-2 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Problem Explorer Preview
                  </span>
                </div>
                <span className="font-mono text-[11px] text-emerald-600 dark:text-[#00ff9d]">
                  Live Preview
                </span>
              </div>

              {/* Sample problem items */}
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition-colors dark:border-slate-800/80 dark:bg-[#070e1c]/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        1365D - Solve The Maze
                      </span>
                      <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                        1400
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Graphs
                      </span>
                      <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        BFS
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                    <Check size={12} strokeWidth={3} />
                    <span>Mastered</span>
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition-colors dark:border-slate-800/80 dark:bg-[#070e1c]/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        1552B - Running for Gold
                      </span>
                      <span className="rounded bg-yellow-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-400">
                        1500
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Greedy
                      </span>
                      <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Two Pointers
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-yellow-500/15 px-2.5 py-1 text-[11px] font-semibold text-yellow-700 dark:text-yellow-400">
                    <Clock size={12} />
                    <span>Revision Due</span>
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 transition-colors dark:border-slate-800/80 dark:bg-[#070e1c]/80">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                        1635D - Infinite Set
                      </span>
                      <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-800 dark:bg-red-950/60 dark:text-red-400">
                        1800
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        DP
                      </span>
                      <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Bitmasks
                      </span>
                    </div>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-cyan-500/15 px-2.5 py-1 text-[11px] font-semibold text-cyan-700 dark:text-cyan-400">
                    <span>Queue</span>
                  </span>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-200 pt-3 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                5,000+ problems cataloged with difficulty rating and algorithmic concepts.
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION C — CONTESTS (id="contests")
           ══════════════════════════════════════════════════════════════════════ */}
        <section
          id="contests"
          aria-labelledby="contests-heading"
          className="scroll-mt-28 border-t border-slate-200/80 py-16 dark:border-slate-800/80"
        >
          <div className="text-center">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-[#00ff9d]">
              TIMED PRESSURE
            </span>
            <h2
              id="contests-heading"
              className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white"
            >
              Simulate Real Contest Conditions
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
              Practice under the clock to eliminate competition hesitation. Build speed, discipline, and endurance before your next rated competition.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {/* Contest Feature 1 */}
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-[#0a1528]/80">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Timer size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                Timed Practice Sprints
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Configure 2-hour standard rounds or customized 45-minute speedruns to drill pattern recognition under time constraints.
              </p>
            </div>

            {/* Contest Feature 2 */}
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-[#0a1528]/80">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <BarChart3 size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                Automated Penalty Tracking
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Live scoreboard with real-time penalties, submission timelines, and rank calculations to simulate authentic contest conditions.
              </p>
            </div>

            {/* Contest Feature 3 */}
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-[#0a1528]/80">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">
                <Zap size={22} />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
                Seamless Post-Contest Upsolving
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Every problem you didn&apos;t finish in time can be queued into your Smart Revision tracker with a single click.
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => handleQuickDemo()}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-xs font-bold text-white shadow-md transition-all hover:brightness-110 active:scale-95 dark:from-emerald-400 dark:to-teal-500 dark:text-slate-950"
            >
              <Trophy size={16} />
              <span>Launch Virtual Contest Mode</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION D — ABOUT (id="about")
           ══════════════════════════════════════════════════════════════════════ */}
        <section
          id="about"
          aria-labelledby="about-heading"
          className="scroll-mt-28 border-t border-slate-200/80 py-16 dark:border-slate-800/80"
        >
          <div className="mx-auto max-w-4xl text-center">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-[#00ff9d]">
              OUR MISSION
            </span>
            <h2
              id="about-heading"
              className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-white"
            >
              Built for Coders Who Refuse to Plateau
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base dark:text-slate-400">
              Most competitive programmers fail to reach candidate master or grandmaster not due to lack of intelligence,
              but because knowledge leaks between practice sessions. CP Companion turns practice into permanent mastery.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-[#0a1528]/80">
              <h4 className="font-mono text-xs font-bold text-emerald-600 dark:text-[#00ff9d]">
                01 / PURPOSE
              </h4>
              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                Permanent Retention
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Solving 500 problems without revision means forgetting 400 of them. Our algorithm ensures every solved problem becomes a lasting mental tool.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-[#0a1528]/80">
              <h4 className="font-mono text-xs font-bold text-cyan-600 dark:text-cyan-400">
                02 / ARCHITECTURE
              </h4>
              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                Modern Full-Stack
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Powered by React 19, TypeScript, Tailwind CSS, TanStack Query, and an embedded PGlite PostgreSQL engine for lightning-fast responsiveness.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-[#0a1528]/80">
              <h4 className="font-mono text-xs font-bold text-amber-600 dark:text-amber-400">
                03 / DATA PRIVACY
              </h4>
              <h3 className="mt-2 text-base font-bold text-slate-900 dark:text-white">
                Zero Cloud Lock-In
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Your data remains yours. Practice statistics, submission logs, and custom revision schedules are safely stored with zero invasive tracking.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Site Footer ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-slate-200 bg-white/80 py-8 backdrop-blur-md transition-colors dark:border-slate-800/80 dark:bg-[#040810]/90">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-10">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 text-xs font-bold text-slate-950">
              &lt;/&gt;
            </div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              CP COMPANION &copy; {new Date().getFullYear()} — Deliberate practice for competitive programmers.
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => scrollToSection("features")}
              className="text-xs text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-[#00ff9d]"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("problems")}
              className="text-xs text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-[#00ff9d]"
            >
              Problems
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("contests")}
              className="text-xs text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-[#00ff9d]"
            >
              Contests
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("about")}
              className="text-xs text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-[#00ff9d]"
            >
              About
            </button>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:underline dark:text-[#00ff9d]"
            >
              <span>Back to Top</span>
              <ArrowUp size={12} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      className="h-4 w-4 text-slate-400"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
