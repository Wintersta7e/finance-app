# Architecture

## Overview
Electron shell hosting a Vite/React TypeScript frontend that communicates with the local NestJS backend (`http://127.0.0.1:8080/api`). Development loads the Vite dev server in Electron; production loads the built `dist/` assets.

## Runtime flow
- **Electron main (`electron/main.js`)** creates a `BrowserWindow`. In development it loads `http://localhost:5173` (Vite dev server) and opens devtools; in production it loads `dist/index.html`, runs Prisma migrations via `execSync`, then spawns the compiled NestJS backend via `fork()` (`dist/src/main.js`). The SQLite database is stored alongside the portable EXE in `data/finance.db`.
- The backend binds to port 8080; ensure it is free or the UI will show connection errors until restarted.
- **Renderer (React)** lives under `src/`, bootstrapped by `src/main.tsx`. `src/App.tsx` renders a sidebar layout and switches between Dashboard, Accounts, Transactions, Categories, Recurring Rules, Analytics, and Budgets pages that fetch backend data via the API client (with retry logic for startup race conditions). UI uses shared primitives in `src/components/ui/` with tokens from `src/theme.ts`.
- **IPC/Node integration**: disabled (`nodeIntegration: false`, `contextIsolation: true`, `backgroundThrottling: false`); renderer uses standard browser APIs to call the backend.
- **Focus handling**: main.js listens for window `focus` events and calls `webContents.focus()` to restore input focus after alt-tabbing — fixes Chromium/Electron focus bugs on Windows.

## Key directories
- `electron/` — main process code.
- `src/api/` — base URL config, DTO typings, and a fetch wrapper with retry logic for backend endpoints.
- `src/components/` — layout shell, navigation, charts (Recharts), shared UI primitives, quick transaction form (`components/transactions`), and UI docs (`UI.md`).
- `src/theme.ts` — design tokens (colors, radii, shadows).
- `src/pages/` — dashboard, accounts, transactions, recurring rules, analytics, and budgets views.
- `src/` — React entry (`main.tsx`) and app shell (`App.tsx`).
- `public/` — static assets copied into the build.
- `dist/` — Vite build output consumed by Electron in production mode.

## Scripts and tooling
- `dev`: Vite dev server (full environment started from monorepo root via `npm run dev`).
- `build`: Vite build for the renderer.
- `build:desktop`: builds renderer and packages Electron app (electron-builder) bundling compiled NestJS backend and production `node_modules` via extraResources.
- `lint`: ESLint.
- `typecheck`: TypeScript type checking.

## Backend integration notes
- Base URL: `http://127.0.0.1:8080/api`. Backend CORS is already open for local Electron/Vite usage.
- NestJS backend compiled with `tsc`, run via `fork()` with IPC ready signal for startup coordination.
- Prisma ORM with SQLite — migrations run in Electron main process before backend fork.

## UI patterns

### Modal
- Auto-focuses first focusable element when opened
- Closes on backdrop click (using `onMouseDown` with target check to avoid event interference with inputs)
- Supports `zIndex` prop for nested modals (default 50, use 60 for nested)

### Form inputs
- Use functional state updates to avoid stale closures: `onChange={(e) => { const val = e.target.value; setForm(prev => prev ? { ...prev, field: val } : prev); }}`
- Avoid `inputMode="decimal"` — triggers IME issues in Electron on Windows that block text input
