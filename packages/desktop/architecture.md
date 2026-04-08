# Architecture

## Overview

Electron shell hosting a Vite 8 / React 19 / TypeScript 6 frontend that communicates with the local NestJS backend (`http://127.0.0.1:8080/api`). Development loads the Vite dev server in Electron; production loads the built `build/` assets.

## Runtime Flow

- **Electron main (`electron/main.js`)** creates a `BrowserWindow`. In development it loads `http://localhost:5173` (Vite dev server) and opens DevTools; in production it loads `build/index.html`.
- **Migrations**: Before starting the backend, `main.js` runs a lightweight migration runner using PrismaClient with the `@prisma/adapter-better-sqlite3` driver. It reads SQL from `prisma/migrations/*/migration.sql` and applies via `$executeRawUnsafe`, compatible with `prisma migrate deploy` checksums.
- **Backend**: Spawned via `fork()` as a child process (`dist/src/main.js`). IPC `'ready'` signal coordinates startup. Shutdown via IPC `'shutdown'` message (not SIGTERM — Windows compatibility). PID file tracks orphan processes.
- **Database**: SQLite stored in `<userData>/data/finance.db` (packaged) or `data/` next to portable EXE.
- **Security**: `nodeIntegration: false`, `contextIsolation: true`. No preload script — renderer uses standard `fetch()` to call the backend API. `setWindowOpenHandler` blocks popups, `will-navigate` blocks external navigation.

## Key Directories

```
electron/           Main process (backend lifecycle, migrations, logging)
src/
├── api/            Backend client (fetch wrapper with retry), types, config
├── pages/          13 route pages (Dashboard through Settings)
├── components/     UI primitives (see UI section below)
├── hooks/          Shared hooks (useIsMounted, useCategories, useCommandPalette, useBackendReady)
└── main.tsx        React entry → App.tsx (sidebar router)
build/              Vite output (consumed by Electron in production)
dist/               electron-builder output (win-unpacked, portable EXE)
```

## UI System

"Neon Pulse" dark theme implemented with Tailwind CSS 4 + Framer Motion.

### Components

| Component | Purpose |
|-----------|---------|
| SidePanel | Slide-out editor panel for CRUD forms |
| CommandPalette | `Ctrl+K` fuzzy search for pages and actions |
| CommandStrip | Sidebar navigation with page icons |
| DateGroupedList | Memoized date-grouped transaction list |
| SparkBars / SparkLine | Inline mini-charts for dashboard metrics |
| OrbitalRing | Circular progress indicator (budget health) |
| GlowBar | Animated loading indicator |
| MetricStrip | Horizontal metric display row |
| InsightBlock | Contextual info block in side panels |
| Toast | Notification toasts |
| DropdownMenu | Context menus |
| EmptyState | Empty data placeholder with optional action |
| PillChip | Category/tag pill labels |

### Patterns

- All pages use `useIsMounted()` for unmount safety in fetch callbacks and mutation handlers
- Functional state updates: `setForm(prev => ({ ...prev, field: val }))`
- UTC date construction: `Date.UTC()` and `getUTCFullYear()`/`getUTCMonth()` for all API date params
- Memoization: `useMemo` for sorted/filtered/grouped data, `useCallback` for stable references
- Load generation counters for race condition prevention in paginated fetches

## Scripts

| Script | Description |
|--------|-------------|
| `dev` | Vite dev server |
| `build` | Vite production build to `build/` |
| `build:desktop` | Full pipeline: backend deps + Vite build + electron-builder |
| `lint` | ESLint |
| `typecheck` | TypeScript type checking |

## Backend Integration

- Base URL: `http://127.0.0.1:8080/api` (backend binds to localhost only)
- CORS: `['null']` in production (Electron `file://` origin), localhost origins in dev
- Backend compiled with `tsc`, spawned via `fork()` with IPC ready signal
- Prisma 7 + better-sqlite3 — migrations run in Electron main process before backend fork
