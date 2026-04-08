# Finance Desktop

Personal finance tracking desktop app — track income, expenses, budgets, and savings goals with everything running locally.

![Electron](https://img.shields.io/badge/Electron-41-47848F?logo=electron)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

## Overview

A portable Windows desktop application for personal finance management. No external database or server required — everything runs locally with an embedded SQLite database.

- **Fully Offline** — no cloud, no accounts, your data stays on your machine
- **Portable** — single `.exe`, no installation required
- **Monorepo** — NestJS REST API backend + React frontend in one workspace

## Features

### Core
- **Accounts** — checking, savings, credit, investment, cash with balances
- **Transactions** — income, fixed costs, variable expenses, transfers with pagination and month navigation
- **Categories** — organize transactions, track fixed vs variable costs
- **Recurring Rules** — automatic transaction posting (daily, weekly, monthly, yearly)
- **Budgets** — spending limits per category with progress tracking and projections

### Analytics
- **Monthly Summary** — income, fixed costs, variable expenses, savings at a glance
- **Category Breakdown** — where your money goes each month
- **Net Worth Trend** — balance over time across all accounts (up to 12 months)
- **Budget vs Actual** — track spending against budget limits
- **Recurring Costs** — overview of fixed monthly obligations
- **Savings History** — 6-month income vs expenses comparison

### Additional
- **Tags & Payees** — label and organize transactions
- **Savings Goals** — track progress toward targets with contributions
- **Export/Import** — JSON full backup, CSV transaction export, restore with replace or merge
- **Audit Log** — automatic tracking of all data changes
- **Settings** — currency, first day of month/week preferences
- **Command Palette** — quick keyboard navigation (`Ctrl+K`)
- **Swagger Docs** — full API documentation at `/api/docs` (dev mode)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | [Electron 41](https://electronjs.org) |
| Frontend | [React 19](https://react.dev) + [TypeScript 6](https://typescriptlang.org) + [Vite 8](https://vite.dev) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) + [Framer Motion 12](https://motion.dev) |
| Backend | [NestJS 11](https://nestjs.com) |
| ORM | [Prisma 7](https://prisma.io) + better-sqlite3 adapter |
| Database | SQLite (file-based, portable) |
| Charts | [Recharts](https://recharts.org) |

## Getting Started

### Prerequisites

- Node.js 22+

### Development

```bash
npm install                 # install all workspace dependencies
npm run dev                 # start backend + frontend + Electron
```

The dev server waits for both the backend (port 8080) and frontend (port 5173) before opening the Electron window.

### Commands

```bash
npm run dev                 # full dev environment
npm run dev:backend         # backend only (NestJS, port 8080)
npm test                    # run 201 backend tests
npm run lint                # lint both packages
npm run typecheck           # type-check both packages
bash build-all.sh           # build portable Windows EXE
```

### Production Build

```bash
bash build-all.sh
```

Output: `packages/desktop/dist/Finance Desktop-<version>-portable.exe` (~105 MB)

The portable executable bundles the backend, frontend, and database — no installation required.

## Project Structure

```
packages/
├── backend/                NestJS REST API (port 8080)
│   ├── prisma/             Database schema and migrations
│   ├── prisma.config.ts    Prisma 7 datasource configuration
│   └── src/
│       ├── generated/      Prisma client (auto-generated)
│       ├── modules/        Feature modules (14 total)
│       │   ├── accounts/       CRUD + balance tracking
│       │   ├── analytics/      Summaries, trends, breakdowns
│       │   ├── audit/          Change tracking interceptor
│       │   ├── budgets/        Per-category spending limits
│       │   ├── categories/     Income/expense classification
│       │   ├── export/         JSON/CSV export, JSON import
│       │   ├── goals/          Savings goals + contributions
│       │   ├── health/         Health check endpoint
│       │   ├── payees/         Transaction payees
│       │   ├── recurring-rules/ Auto-post scheduling
│       │   ├── seed/           Initial data setup
│       │   ├── settings/       App preferences
│       │   ├── tags/           Transaction labels
│       │   └── transactions/   Paginated with date filtering
│       ├── prisma/         PrismaService (better-sqlite3 adapter)
│       └── common/         Shared filters, interceptors, DTOs
└── desktop/                Electron + React frontend
    ├── electron/           Main process (backend fork, migrations)
    └── src/
        ├── pages/          13 pages (Dashboard → Settings)
        ├── components/     UI (SidePanel, CommandPalette, SparkLine, etc.)
        ├── api/            Backend client + types
        └── hooks/          Shared React hooks
```

## API

Base URL: `http://127.0.0.1:8080/api`

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `/api/accounts` | CRUD accounts |
| `/api/categories` | CRUD categories |
| `/api/transactions` | CRUD with pagination and date filtering |
| `/api/recurring-rules` | CRUD recurring rules + generate next |
| `/api/budgets` | CRUD budget limits |
| `/api/tags` | CRUD transaction tags |
| `/api/payees` | CRUD payees |
| `/api/goals` | CRUD savings goals + contributions |
| `/api/settings` | App preferences |
| `/api/analytics/*` | Month summary, category breakdown, net worth, budget vs actual, recurring costs |
| `/api/export/*` | JSON/CSV export, JSON import |
| `/api/audit/*` | Audit log queries |
| `/api/docs` | Swagger UI (dev mode only) |

## Testing

201 backend unit tests across 18 suites.

```bash
npm test                    # all tests
npm -w @finance/backend run test:cov   # with coverage report
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run typecheck`
5. Run `npm test`
6. Submit a pull request

## License

MIT License — see [LICENSE](./LICENSE) for details.
