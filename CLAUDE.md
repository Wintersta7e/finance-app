# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Finance Monorepo: A personal finance tracking desktop application with two packages:
- **packages/backend**: NestJS / Prisma / SQLite REST API
- **packages/desktop**: Electron + Vite + React TypeScript desktop client

## Build & Run Commands

### Backend (packages/backend/)
```bash
cd packages/backend
npm run build                   # TypeScript compilation (tsc)
npm run start                   # Run compiled backend
npm run start:dev               # Hot reload dev server (port 8080)
npx jest                        # Run 201 tests
npx jest --coverage             # Run with coverage report
```

### Frontend (packages/desktop/)
```bash
cd packages/desktop
npm run dev                     # Vite dev server only (http://localhost:5173)
npm run dev:desktop             # Vite + Electron together for desktop dev
npm run build                   # Build to dist/
npm run build:desktop           # Build backend + frontend + package Windows EXE
npm run lint                    # ESLint
```

### Root workspace commands
```bash
npm install                     # Install all workspace dependencies
npm run dev                     # Run backend + desktop concurrently
npm run build                   # Build both packages
npm run test                    # Run backend tests
bash build-all.sh               # Full production build (portable EXE)
```

## Architecture

### Backend Layers (packages/backend/src/)
- **modules/**: Feature modules (accounts, categories, transactions, recurring-rules, analytics, budgets, tags, payees, goals, export, audit, seed)
- **prisma/**: PrismaService and PrismaModule
- **common/**: Shared exceptions, filters, pagination DTOs
- **main.ts**: Entry point with Swagger, CORS, validation pipes, shutdown hooks

Each module follows the pattern:
- `*.module.ts` - NestJS module definition
- `*.controller.ts` - REST controller with `/api` prefix
- `*.service.ts` - Business logic with PrismaService injection
- `dto/` - Create/Update DTOs with class-validator decorators
- `*.spec.ts` - Jest tests with mocked PrismaService

Key domain concepts:
- Transaction types: INCOME, FIXED_COST, VARIABLE_EXPENSE, TRANSFER
- RecurringPeriod: DAILY, WEEKLY, MONTHLY, YEARLY
- RecurringRule.nextOccurrence: Tracks when the next auto-post should happen
- Soft delete: `deletedAt` field filtered by default
- Analytics: month summary, category breakdown, net-worth trend, budget vs actual

### Frontend Structure (packages/desktop/src/)
- **pages/**: Route pages (DashboardPage, TransactionsPage, CategoriesPage, RecurringRulesPage, AnalyticsPage, BudgetsPage, AccountsPage)
- **components/ui/**: Design system primitives (Page, Card, Button, Modal, FormField)
- **components/charts/**: Recharts wrappers (CategoryBreakdownChart, NetWorthChart, SavingsPerMonthChart)
- **api/**: Backend client (client.ts, types.ts, config.ts)
- **theme.ts**: Design tokens (colors, radii, shadows)
- **App.tsx**: Page router with Layout sidebar

### Electron (packages/desktop/electron/)
- **main.js**: Spawns NestJS backend via `fork()` in production, loads Vite dev server in development
- Runs Prisma migrations before starting backend
- IPC ready signal for startup coordination
- Graceful shutdown with SIGTERM/SIGKILL escalation
- Renderer uses standard fetch to call backend (no IPC bridge)

## Coding Conventions

### Backend (TypeScript/NestJS)
- 2-space indent, NestJS conventions
- Controllers: `*Controller`, Services: `*Service`, DTOs: `Create*Dto`/`Update*Dto`
- Constructor injection via NestJS DI
- REST paths start with `/api`, return DTOs only
- Soft delete pattern: set `deletedAt`, filter with `where: { deletedAt: null }`
- Entity-in-use protection: check relations before soft delete

### Frontend (TypeScript/React)
- Functional components with hooks, PascalCase filenames
- Hooks: useXxx pattern (e.g., useCategories.ts)
- ESLint with typescript-eslint and react-hooks
- Use functional state updates in form onChange handlers to avoid stale closures: `setForm(prev => ({ ...prev, field: val }))`
- Avoid `inputMode="decimal"` on inputs - causes IME issues in Electron on Windows
- Modal component supports `zIndex` prop - use `zIndex={60}` for nested modals (default is 50)

## Testing

- **Backend**: Jest with mocked PrismaService, tests co-located as `*.spec.ts` (201 tests, 82% statement coverage)
- **Frontend**: ESLint for now; add Vitest/React Testing Library as `*.test.tsx`

## Database

- SQLite via Prisma ORM
- Schema: `packages/backend/prisma/schema.prisma`
- Migrations: `packages/backend/prisma/migrations/`
- Dev database: `packages/backend/prisma/dev.db`
- Production: `file:<userData>/data/finance.db` (or `data/` next to portable EXE)

## API

- Base URL: http://127.0.0.1:8080/api
- Swagger docs: http://127.0.0.1:8080/api/docs
- Health check: GET /api/health
- Endpoints: /accounts, /categories, /transactions, /recurring-rules, /budgets, /settings, /analytics/*, /tags, /payees, /goals, /audit, /export, /import

## Related Documentation

- AGENTS.md: Contributor guidelines and commit conventions
- packages/desktop/architecture.md: Electron/React structure
- packages/desktop/UI.md: Design system and component patterns
- packages/desktop/USER_GUIDE.md: End-user documentation
- docs/plans/: Architecture and implementation plans
