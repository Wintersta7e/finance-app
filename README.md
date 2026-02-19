# Finance Desktop

Personal finance tracking desktop app — track income, expenses, budgets, and savings goals with everything running locally.

[![CI](https://github.com/Wintersta7e/finance-app/actions/workflows/ci.yml/badge.svg)](https://github.com/Wintersta7e/finance-app/actions/workflows/ci.yml)
![Electron](https://img.shields.io/badge/Electron-40-47848F?logo=electron)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

## Overview

A portable Windows desktop application for personal finance management. No external database or server required — everything runs locally with an embedded SQLite database.

- **Fully Offline** — no cloud, no accounts, your data stays on your machine
- **Portable** — single `.exe`, no installation required
- **Monorepo** — NestJS REST API backend + React frontend in one workspace

## Features

### Core
- **Accounts** — checking, savings, cash with balances
- **Transactions** — income, fixed costs, variable expenses, transfers with pagination and date filtering
- **Categories** — organize transactions, track fixed vs variable costs
- **Recurring Rules** — automatic transaction posting (daily, weekly, monthly, yearly)
- **Budgets** — spending limits per category with period tracking

### Analytics
- **Monthly Summary** — income, fixed costs, variable expenses, savings at a glance
- **Category Breakdown** — where your money goes each month
- **Net Worth Trend** — balance over time across all accounts
- **Budget vs Actual** — track spending against budget limits
- **Recurring Costs** — overview of fixed monthly obligations

### Additional
- **Tags & Payees** — label and organize transactions
- **Savings Goals** — track progress with contributions
- **Export/Import** — JSON full backup, CSV transaction export, restore with replace or merge
- **Audit Log** — automatic tracking of all data changes
- **Swagger Docs** — full API documentation at `/api/docs`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | [Electron](https://electronjs.org) |
| Frontend | [React 19](https://react.dev) + [TypeScript](https://typescriptlang.org) + [Vite](https://vite.dev) |
| Backend | [NestJS 11](https://nestjs.com) |
| ORM | [Prisma 6](https://prisma.io) |
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

Output: `packages/desktop/dist/Finance Desktop-<version>-portable.exe`

The portable executable bundles the backend, frontend, and database — no installation required.

## Project Structure

```
packages/
├── backend/                NestJS REST API (port 8080)
│   ├── prisma/             Database schema and migrations
│   └── src/
│       ├── modules/        Feature modules (12 total)
│       │   ├── accounts/       CRUD + balance tracking
│       │   ├── categories/     Income/expense classification
│       │   ├── transactions/   Paginated with date filtering
│       │   ├── recurring-rules/ Auto-post scheduling
│       │   ├── budgets/        Per-category spending limits
│       │   ├── analytics/      Summaries, trends, breakdowns
│       │   ├── tags/           Transaction labels
│       │   ├── payees/         Transaction payees
│       │   ├── goals/          Savings goals + contributions
│       │   ├── export/         JSON/CSV export, JSON import
│       │   ├── audit/          Change tracking
│       │   └── seed/           Initial data setup
│       └── common/         Shared filters, interceptors, DTOs
└── desktop/                Electron + React frontend
    ├── electron/           Main process (spawns backend via fork)
    └── src/
        ├── pages/          Route pages (7 total)
        ├── components/     UI primitives + chart wrappers
        ├── api/            Backend client with retry logic
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
| `/api/analytics/*` | Month summary, category breakdown, net worth, budget vs actual, recurring costs |
| `/api/export/*` | JSON/CSV export, JSON import |
| `/api/audit/*` | Audit log queries |
| `/api/docs` | Swagger UI |

## Testing

201 backend unit tests with 82% statement coverage.

```bash
npm test                    # all tests
npm -w @finance/backend run test:cov   # with coverage report
```

| Module | Tests |
|--------|-------|
| Accounts | 22 |
| Categories | 22 |
| Transactions | 22 |
| Recurring Rules | 26 |
| Analytics | 19 |
| Budgets | 19 |
| Tags | 19 |
| Payees | 19 |
| Goals | 17 |
| Export | 8 |
| Audit | 8 |
| **Total** | **201** |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run typecheck`
5. Run `npm test`
6. Submit a pull request

## License

MIT License — see [LICENSE](./LICENSE) for details.
