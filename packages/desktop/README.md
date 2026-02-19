# Finance Desktop (Electron + Vite + React)

Electron shell around the finance app. The renderer talks to the NestJS backend at `http://127.0.0.1:8080/api` and renders React screens via Vite.

## Prerequisites
- Node 22+
- Dependencies installed from the monorepo root: `npm install`

## Install & run
- **Full dev environment** (from monorepo root): `npm run dev` — starts backend (port 8080), Vite (port 5173), waits for both, then launches Electron
- **Frontend only**: `npm run dev` — Vite dev server on `http://localhost:5173` (needs backend running separately)
- **Package Windows portable EXE**: `bash build-all.sh` from monorepo root
  - Output: `dist/Finance Desktop-<version>-portable.exe`
  - Bundles compiled NestJS backend, frontend assets, production `node_modules`, and Prisma engine
  - All data stored next to the EXE in `data/`

## API expectations
- Backend base URL: `http://127.0.0.1:8080/api`
- Frontend calls accounts, categories, transactions, recurring rules, budgets, analytics, tags, payees, goals, export/import, and audit endpoints
- API client has retry with exponential backoff for backend startup race condition
- Backend CORS allows local Electron/Vite clients

## Project structure
- `electron/main.js` — Electron main process; loads Vite dev server in dev or `dist/index.html` in production; runs Prisma migrations then spawns NestJS backend via `fork()` when packaged
- `src/main.tsx` — Bootstraps React into the DOM
- `src/App.tsx` — Page shell with sidebar; switches between Dashboard, Accounts, Transactions, Categories, Recurring Rules, Analytics, and Budgets
- `src/components/Layout.tsx` — Sidebar layout and navigation; chart components under `src/components/charts/`
- `src/components/ui/` — Shared UI primitives (Page, Card, Button, Modal, FormField) driven by `src/theme.ts`
- `src/components/transactions/` — Quick-add transaction form used on Dashboard and Transactions
- `src/pages/` — Route pages (7 total)
- `src/api/` — `config.ts` (base URL), `types.ts` (DTOs), `client.ts` (fetch helpers with retry logic)
- `public/` — Static assets bundled by Vite

## UI/design system
- Theme tokens in `src/theme.ts` (colors, radii, shadows)
- Global dark styles in `src/index.css`
- Component guide + flows: `UI.md`
- User-facing walkthrough: `USER_GUIDE.md`

## Portable runtime notes (Windows)
- The packaged EXE runs Prisma migrations on startup, then forks the compiled NestJS backend (`dist/src/main.js`)
- Database: SQLite file at `<EXE_DIR>/data/finance.db` via Prisma
- Ensure port 8080 is free; otherwise the backend will fail to start
- Health check: `curl http://127.0.0.1:8080/api/health`

## Scripts (package.json)
- `dev` — Vite dev server
- `build` — Vite production build
- `build:desktop` — Build backend + frontend + package Windows EXE
- `lint` — ESLint
- `typecheck` — TypeScript type checking
