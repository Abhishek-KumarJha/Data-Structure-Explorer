# CP Companion – Competitive Programming Practice & Analysis System

[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20TypeScript%20%7C%20Node.js%20%7C%20PostgreSQL-blue.svg)](#technology-stack)
[![Database](https://img.shields.io/badge/Database-PostgreSQL%20%7C%20Drizzle%20ORM%20%7C%20PGlite-green.svg)](#database-architecture)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

A production-ready, dynamic web application designed for competitive programmers and software engineers to practice problem-solving with intent. Built as a monorepo featuring automated spaced repetition, virtual contests, prefix search autocomplete, performance analytics, and cloud data synchronization.

---

## 🚀 Key Features

- 🔐 **Authentication & Security**: Secure JWT authentication with `bcryptjs` password hashing and `httpOnly` cookie support.
- 📚 **Dynamic Problem Library**: Manage problems across LeetCode, Codeforces, AtCoder, CodeChef, HackerRank, CSES, and custom platforms with filters for status, difficulty, tags, and favorites.
- 🧠 **Smart SM-2 Revision Queue**: Automated spaced repetition using the SuperMemo SM-2 algorithm to schedule review intervals based on user recall ratings (0–5).
- 🏆 **Virtual Contests**: Timed solo arena sessions with difficulty-balanced problem selection driven by a greedy algorithm.
- 🔍 **Instant Trie Search**: $O(k)$ prefix tree search autocomplete operating both server-side and browser-side.
- 📊 **Live Analytics & Heatmap**: 365-day Github-style calendar activity heatmap (using Prefix Sum range queries), monthly progress trends, topic success rates, and difficulty breakdowns using Recharts.
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
│   │   │   ├── lib/dsa/        # Backend Data Structures & Algorithms
│   │   │   │   ├── trie.ts     # Prefix Tree for Search Autocomplete
│   │   │   │   ├── priority-queue.ts # MinHeap Priority Queue
│   │   │   │   └── algorithms.ts   # SM-2, Prefix Sum, Greedy Selection
│   │   │   ├── middlewares/    # JWT Auth Middleware
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
│       ├── src/
│       │   ├── components/     # Shell, Page, SearchModal layouts
│       │   ├── hooks/          # useAuth, useDebounce
│       │   ├── lib/            # Typed API Client & Client Trie/MinHeap
│       │   └── pages/          # Overview, Problems, Revision, Contest,
│       │                       # Analytics, Settings, Login, Collaborator
└── lib/
    └── db/                     # Drizzle ORM PostgreSQL Schema & Connection Engine
        └── src/
            ├── schema/         # 15 Normalized Database Tables
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
- **Authentication**: JSON Web Tokens (JWT), `bcryptjs`
- **Logging & Utilities**: Pino, Cookie-Parser, CORS

### **Database & ORM**
- **ORM**: Drizzle ORM
- **Production Driver**: Node-Postgres (`pg`)
- **Zero-Setup Local Driver**: PGlite (`@electric-sql/pglite` WASM PostgreSQL Engine)
- **Schema**: 15 Normalized PostgreSQL Tables

---

## 🧮 Data Structures & Algorithms

| Algorithm / Data Structure | Implementation File | Purpose & Complexity |
| :--- | :--- | :--- |
| **Trie (Prefix Tree)** | `lib/dsa/trie.ts` & `ClientTrie.ts` | $O(k)$ prefix autocomplete for problem titles and sub-words. |
| **MinHeap Priority Queue** | `lib/dsa/priority-queue.ts` | $O(\log n)$ insertion/extraction for ordering revision queue items by urgency score. |
| **SM-2 Spaced Repetition** | `lib/dsa/algorithms.ts` | $O(1)$ computation of interval, repetitions, and ease factor based on recall score ($0–5$). |
| **Prefix Sum Array** | `lib/dsa/algorithms.ts` | $O(1)$ range sum queries for 7-day, 30-day, and 365-day heatmap aggregations. |
| **Greedy Selection** | `lib/dsa/algorithms.ts` | $O(n \log n)$ difficulty-balanced problem set generation for virtual contests. |

---

## 🗄️ Database Schema (15 Tables)

1. `users` — User profiles, password hashes, weekly goals, theme preferences.
2. `problems` — Problem library items, difficulty, platform, status, solution links, notes.
3. `revision_queue` — Spaced repetition metadata (interval, ease factor, repetitions, next review timestamp).
4. `contests` — Arena session parameters, score, start/end timestamps, completion status.
5. `contest_problems` — Junction table linking problems to contests with problem labels (A, B, C, etc.).
6. `solve_history` — Log of all problem solves for activity heatmaps and progress calculations.
7. `user_statistics` — Solved counts, current streaks, longest streaks, last active date.
8. `notes` — Personal problem notes and code snippets.
9. `search_history` — User search query history.
10. `import_export_history` — Audit trail for CSV/JSON imports and exports.
11. `platforms` — Supported coding platforms catalog.
12. `topics` — Problem topic categories.
13. `problem_topics` — Junction table connecting problems to multiple topics.
14. `favorites` — Quick access favorite problems.
15. `bookmarks` — Bookmarked problems for later review.

---

## 🔌 API Reference

### **Authentication**
- `POST /api/auth/register` — Register a new user account
- `POST /api/auth/login` — Sign in and receive JWT token & httpOnly cookie
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

3. **Start API Server** (Terminal 1):
   ```bash
   PORT=5000 pnpm --filter @workspace/api-server exec tsx src/index.ts
   ```

4. **Start Web Frontend** (Terminal 2):
   ```bash
   PORT=3000 BASE_PATH="/" VITE_API_URL="http://localhost:5000" pnpm --filter @workspace/cp-companion exec vite --config vite.config.ts --host 127.0.0.1
   ```

5. Open your browser at **`http://127.0.0.1:3000/`**.

---

## 🌐 Production Deployment Guide

### **Render.com (Monorepo Setup)**

1. **Database**: Create a free PostgreSQL database on Render.
2. **Backend API Web Service**:
   - **Root Directory**: `artifacts/api-server`
   - **Build Command**: `pnpm install`
   - **Start Command**: `npx tsx src/index.ts`
   - **Environment Variables**: Set `DATABASE_URL` and `JWT_SECRET`.
3. **Frontend Static Site**:
   - **Root Directory**: `artifacts/cp-companion`
   - **Build Command**: `pnpm install && pnpm run build`
   - **Publish Directory**: `artifacts/cp-companion/dist/public`
   - **Environment Variable**: `VITE_API_URL` pointing to your deployed API server URL.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for details.
