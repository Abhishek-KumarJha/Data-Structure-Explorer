# CP Companion

CP Companion is a local-first competitive programming practice and analysis system for organizing problems, running focused practice sessions, and understanding progress.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/cp-companion/src/App.tsx` — responsive application shell, local profile gate, routes, library actions, contest mode, analytics, and settings.
- `artifacts/cp-companion/src/index.css` — parchment/midnight visual theme and motion utilities.
- `artifacts/api-server/src/routes/problems.ts` — problem library, seeded data, analytics summary, and revision queue endpoints.
- `lib/api-spec/openapi.yaml` — source of truth for the API contract.
- `lib/db/src/schema/index.ts` — Drizzle schema for the problem library.

## Architecture decisions

- API contracts are defined in OpenAPI and regenerated into typed React Query clients and Zod validators.
- The managed PostgreSQL database is used behind a repository-friendly Drizzle schema so storage can be changed later without changing the UI contract.
- The first-run experience is local-first: a browser-only profile gate and localStorage fallback keep the practice surface usable when the API is unavailable.
- The interface delegates visual structure to the frontend design layer while keeping CRUD, analytics, and revision behavior real.

## Product

- Local sign-in/profile gate with browser-scoped data.
- Dashboard with weekly momentum, solved/favorite totals, focus topics, and recent problems.
- Searchable/filterable problem library with add, edit, delete, favorite, and solved actions.
- Collaborator room with friend invites, a shared pinned problem, persistent room chat, and solved-problem leaderboard.
- Timed virtual contest surface, priority revision queue, analytics charts, and difficulty/topic summaries.
- JSON and CSV import/export, theme switching, and local workspace reset.

## User preferences

- Keep the product portfolio-ready, professional, responsive, and centered on practical data structures and algorithms.

## Gotchas

- The Vite build expects `PORT` and `BASE_PATH` from the managed workflow; standalone verification should provide both explicitly.
- Regenerate API client/Zod output after changing `lib/api-spec/openapi.yaml`.
- Collaboration data is currently browser-local, matching the app's local-first profile mode; shared multi-device rooms would require collaboration API/auth work.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
