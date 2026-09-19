# CP Companion – Competitive Programming Practice & Analysis System

[![Stack](https://img.shields.io/badge/Stack-React%2019%20%7C%20TypeScript%20%7C%20Node.js%20%7C%20PostgreSQL-blue.svg)](#technology-stack)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Drizzle%20ORM%20%7C%20PGlite-green.svg)](#database-architecture)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Theme](https://img.shields.io/badge/Theme-Dark%20Futuristic%20%26%20Light%20Mode-emerald.svg)](#modern-visual-design--theming)

A production-grade, full-stack web application engineered for competitive programmers and software engineers to practice problem-solving with intent. Built as a monorepo featuring an immersive full-screen landing experience, automated spaced repetition (SM-2), virtual contest simulation, Trie-based autocomplete search, interactive problem exploration, live analytics heatmaps, and cloud-ready data persistence.

---

## 🚀 Key Features

- 🌌 **Full-Screen Hero & Landing Experience**: A developer-platform landing page occupying the full browser viewport (`100svh`), featuring rich visual coding illustrations, floating practice loop cards, a 4-metric statistics summary (`10K+ Learners`, `5K+ Problems`, `500+ Contests`), and motivational microcopy.
- 🌓 **Comprehensive Dark & Light Modes**: Seamless instant theme switching with `localStorage` persistence, system preference auto-detection, and an inline anti-flicker script in the HTML `<head>`.
- 🧭 **Functional Anchor Navigation**: Header links (`#features`, `#problems`, `#contests`, `#about`) connected to real on-page sections with smooth scrolling, `scroll-mt-28` header offsets, active section tracking, and a responsive mobile drawer.
- 🔐 **Secure Authentication & Demo Access**: Full session authentication powered by `bcryptjs` and JWT cookies, paired with an instant **⚡ Instant Demo Access** button for rapid evaluation.
- 📚 **Systematic Problem Management**: Centralize problems across LeetCode, Codeforces, AtCoder, CodeChef, HackerRank, CSES, and custom platforms with status filters, difficulty tiers, and topic tagging.
- 🧠 **Smart SM-2 Revision Queue**: Automated spaced repetition engine utilizing the SuperMemo SM-2 algorithm to schedule review intervals based on recall ratings (0–5), with historical review logging via `revision_reviews`.
- 🏆 **Virtual Contests**: Timed arena sessions with difficulty-balanced problem selection driven by a greedy algorithm, live clocks, and one-click post-contest upsolving.
- 🔍 **Instant Trie Search & Autocomplete**: $O(k)$ prefix tree search operating server-side and browser-side with recent query history and reactive URL query synchronization.
- 📊 **Live Analytics & Heatmaps**: 365-day calendar activity heatmaps (powered by Prefix Sum range queries), monthly progress trends, topic success rates, and difficulty breakdowns using Recharts.
- 💾 **Data Import & Export**: Full CSV and JSON export/import capability with automatic duplicate detection and append/replace modes.
- ⚡ **Zero-Setup Database Engine**: Runs natively with **PGlite (WebAssembly PostgreSQL)** in local development when `DATABASE_URL` is omitted, and seamlessly switches to a production PostgreSQL database server when configured.

---

## 🏗️ Workspace Architecture

The project is structured as a `pnpm` monorepo:

```text
Data-Structure-Explorer/
├── artifacts/
│   ├── api-server/             # Express.js REST API Server
│   │   ├── src/
│   │   │   ├── lib/dsa/        # Data Structures & Algorithms
│   │   │   │   ├── trie.ts     # Prefix Tree for Search Autocomplete
│   │   │   │   ├── priority-queue.ts # MinHeap Priority Queue
│   │   │   │   └── algorithms.ts   # SM-2, Prefix Sum, Greedy Selection
│   │   │   ├── middlewares/    # JWT Auth & Rate Limiting Middlewares
│   │   │   └── routes/         # Express Route Handlers
│   │   │       ├── auth.ts
│   │   │       ├── problems.ts
│   │   │       ├── revision.ts
│   │   │       ├── contest.ts
│   │   │       ├── analytics.ts
│   │   │       ├── search.ts
│   │   │       ├── notes.ts
│   │   │       ├── import-export.ts
│   │   │       └── settings.ts
│   └── cp-companion/           # React 19 + TypeScript + Vite Frontend
│       ├── public/             # Static Assets & Hero Artwork
│       ├── src/
│       │   ├── components/     # Shell, Page, SearchModal, Problem Explorer
│       │   ├── hooks/          # useAuth, useDebounce
│       │   ├── lib/            # Typed API Client & Client-side Trie
│       │   └── pages/          # Login (Landing Page), Overview, Problems,
│       │                       # Revision, Contest, Analytics, Settings
└── lib/
    └── db/                     # Drizzle ORM PostgreSQL Schema & Connection Engine
        └── src/
            ├── schema/         # 16 Normalized Database Tables
            └── index.ts        # Node-Postgres / PGlite WASM database switcher
```

---

## 🛠️ Technology Stack

### **Frontend**
- **Framework**: React 19, Vite, TypeScript
- **Styling**: Tailwind CSS v4, Lucide Icons, Custom Design Tokens
- **Routing**: Wouter
- **State & Data Fetching**: TanStack React Query v5
- **Charts & Visualization**: Recharts

### **Backend**
- **Runtime & Server**: Node.js, Express.js
- **Authentication**: JSON Web Tokens (JWT), `bcryptjs`, Cookie-Parser
- **Logging & Utilities**: Pino, CORS, Rate-Limiting

### **Database & ORM**
- **ORM**: Drizzle ORM
- **Production Driver**: Node-Postgres (`pg`)
- **Zero-Setup Local Driver**: PGlite (`@electric-sql/pglite` WASM PostgreSQL Engine)
- **Schema**: 16 Normalized PostgreSQL Tables

---

## 🎨 Modern Visual Design & Theming

### **Dark Futuristic Mode (Default)**
- **Palette**: Deep navy background (`#060c18`), translucent dark blue cards (`#0c162d`), neon green accents (`#00ff9d`), cyan glows, and subtle mountain silhouettes.
- **Atmosphere**: Developer-focused, ambient glowing gradients, high contrast code typography.

### **Light Mode**
- **Palette**: Clean off-white background (`#f8fafc`), crisp white cards (`bg-white/95`), deep slate text (`#0f172a`), accessible emerald accents (`#059669`), and soft elevation shadows.
- **Contrast**: Full WCAG compliance with distinct input borders and accessible button states.

---

## 🧮 Data Structures & Algorithms

| Algorithm / Data Structure | Implementation File | Purpose & Complexity |
| :--- | :--- | :--- |
| **Trie (Prefix Tree)** | `artifacts/api-server/src/lib/dsa/trie.ts` | $O(k)$ prefix autocomplete for problem titles, IDs, and tags. |
| **MinHeap Priority Queue** | `artifacts/api-server/src/lib/dsa/priority-queue.ts` | $O(\log n)$ insertion/extraction for ordering revision queue items by urgency score. |
| **SM-2 Spaced Repetition** | `artifacts/api-server/src/lib/dsa/algorithms.ts` | $O(1)$ computation of interval, repetitions, and ease factor based on recall score ($0–5$). |
| **Prefix Sum Array** | `artifacts/api-server/src/lib/dsa/algorithms.ts` | $O(1)$ range sum queries for 7-day, 30-day, and 365-day heatmap aggregations. |
| **Greedy Selection** | `artifacts/api-server/src/lib/dsa/algorithms.ts` | $O(n \log n)$ difficulty-balanced problem set generation for virtual contests. |

---

## 🗄️ Database Schema (16 Tables)

1. `users` — User profiles, password hashes, weekly goals, theme preferences.
2. `problems` — Problem library items, difficulty, platform, status, solution links, notes.
3. `revision_queue` — Spaced repetition metadata (interval, ease factor, repetitions, next review timestamp).
4. `revision_reviews` — Historic review attempts, recall ratings, ease factor changes, and completion timestamps.
5. `contests` — Arena session parameters, score, start/end timestamps, completion status.
6. `contest_problems` — Junction table linking problems to contests with problem labels (A, B, C, etc.).
7. `solve_history` — Log of all problem solves for activity heatmaps and progress calculations.
8. `user_statistics` — Solved counts, current streaks, longest streaks, last active date.
9. `notes` — Personal problem notes and code snippets.
10. `search_history` — User search query history for instant repeat searches.
11. `import_export_history` — Audit trail for CSV/JSON imports and exports.
12. `platforms` — Supported coding platforms catalog.
13. `topics` — Problem topic categories.
14. `problem_topics` — Junction table connecting problems to multiple topics.
15. `favorites` — Quick access favorite problems.
16. `bookmarks` — Bookmarked problems for later review.

---

## 🔌 API Reference

### **Authentication**
- `POST /api/auth/register` — Register a new user account
- `POST /api/auth/login` — Sign in and receive JWT token & cookie
- `POST /api/auth/logout` — Clear auth token
- `GET /api/auth/me` — Retrieve current authenticated user profile
- `PUT /api/auth/profile` — Update user profile preferences

### **Problem Library**
- `GET /api/problems` — Filtered & paginated problem listing
- `POST /api/problems` — Add a new problem
- `GET /api/problems/:id` — Retrieve problem details
- `PATCH /api/problems/:id` — Update problem details/status
- `DELETE /api/problems/:id` — Delete a problem

### **Revision Queue**
- `GET /api/revision/queue` — Fetch due revision items ordered by MinHeap priority
- `POST /api/revision/:problemId/complete` — Submit SM-2 rating (0–5) and update interval
- `GET /api/revision/stats` — Fetch revision retention metrics

### **Virtual Contests**
- `GET /api/contests` — List past and active contests
- `POST /api/contests` — Generate new contest with greedy problem selection
- `GET /api/contests/:id` — Fetch contest details and remaining time
- `POST /api/contests/:contestId/problems/:problemId/submit` — Submit problem in contest
- `PATCH /api/contests/:id/complete` — Complete contest session

### **Analytics & Search**
- `GET /api/analytics/summary` — Fetch overview statistics and weekly activity
- `GET /api/analytics/heatmap` — 365-day heatmap data with Prefix Sum metrics
- `GET /api/analytics/topics` — Topic breakdown and success rates
- `GET /api/search` — Full-text DB search
- `GET /api/search/autocomplete` — Trie-based autocomplete suggestions

### **Import / Export & Settings**
- `GET /api/export/json` — Export problem library to JSON
- `GET /api/export/csv` — Export problem library to CSV
- `POST /api/import/json` — Import problems from JSON
- `POST /api/import/csv` — Import problems from CSV
- `POST /api/settings/reset` — Reset all user data (cascade delete)

---

## 💻 Local Development Setup

### **Prerequisites**
- **Node.js**: v18.0.0 or higher
- **pnpm**: v9.0.0 or higher

### **Quick Start**

1. **Clone Repository**:
   ```bash
   git clone https://github.com/Abhishek-KumarJha/Data-Structure-Explorer.git
   cd Data-Structure-Explorer
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install --ignore-scripts
   ```

3. **Start Development Environment**:
   ```bash
   # Terminal 1: Start API Server (Runs with embedded PGlite WASM automatically)
   pnpm --filter @workspace/api-server run dev

   # Terminal 2: Start Frontend Application
   pnpm --filter @workspace/cp-companion run dev
   ```

   Visit `http://localhost:3000` to view the full-screen landing page and live workspace.

4. **One-Click Demo Login**:
   Click **"⚡ Instant Demo Access"** on the registration card to immediately log into the pre-seeded demo environment (`test@example.com` / `password123`).

---

## 🌐 Production Deployment

### **Backend (Render.com / Railway / Fly.io)**
1. **Root Directory**: `.`
2. **Build Command**:
   ```bash
   npx pnpm install --ignore-scripts && pnpm --filter @workspace/api-server run build
   ```
3. **Start Command**:
   ```bash
   node artifacts/api-server/dist/index.mjs
   ```
4. **Environment Variables**:
   - `PORT`: `5000`
   - `DATABASE_URL`: Managed PostgreSQL connection string
   - `JWT_SECRET`: Random 64-character secret
   - `CLIENT_ORIGIN`: Your frontend URL (e.g. `https://cp-companion.vercel.app`)

### **Frontend (Vercel / Cloudflare Pages / Netlify)**
1. **Root Directory**: `.`
2. **Build Command**:
   ```bash
   npx pnpm install --ignore-scripts && pnpm --filter @workspace/cp-companion run build
   ```
3. **Publish Directory**: `artifacts/cp-companion/dist`
4. **Environment Variables**:
   - `VITE_API_URL`: Your deployed backend URL

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
