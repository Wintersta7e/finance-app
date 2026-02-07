# Finance Desktop

Personal finance tracking desktop app — Electron + NestJS + Prisma + SQLite.

A portable Windows desktop application for tracking income, expenses, budgets, recurring transactions, and savings goals. No external database or server required — everything runs locally with an embedded SQLite database.

## Features

- **Accounts** — multiple accounts (checking, savings, cash) with balances
- **Transactions** — income, fixed costs, variable expenses, transfers with pagination and date filtering
- **Categories** — organize transactions, track fixed vs variable costs
- **Recurring Rules** — automatic transaction posting (daily, weekly, monthly, yearly)
- **Budgets** — set spending limits per category with period tracking
- **Analytics** — monthly summary, category breakdown, net worth trend, budget vs actual, recurring cost overview
- **Tags & Payees** — label and organize transactions
- **Savings Goals** — track progress toward financial targets with contributions
- **Export/Import** — JSON full backup, CSV transaction export, restore with replace or merge
- **Audit Log** — automatic tracking of all data changes

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron |
| Frontend | React + TypeScript + Vite |
| Backend | NestJS |
| ORM | Prisma |
| Database | SQLite (file-based, portable) |
| Charts | Recharts |

## Project Structure

```
packages/
├── backend/          NestJS REST API (port 8080)
│   ├── prisma/       Database schema and migrations
│   └── src/modules/  accounts, categories, transactions,
│                     recurring-rules, analytics, budgets,
│                     tags, payees, goals, export, audit, seed
└── desktop/          Electron + React frontend
    ├── electron/     Main process (spawns backend)
    └── src/          React pages and components
```

## Getting Started

### Prerequisites

- Node.js 20+

### Development

```bash
npm install                 # install all workspace dependencies
npm run dev                 # start backend + frontend together
```

Or separately:

```bash
npm run dev:backend         # NestJS with hot reload (port 8080)
npm run dev:desktop         # Vite + Electron
```

### Testing

```bash
npm test                    # run all 201 tests
```

### Production Build

```bash
bash build-all.sh           # builds portable Windows EXE
```

Output: `packages/desktop/dist/Finance Desktop-<version>-portable.exe`

The portable executable bundles the backend, frontend, and database — no installation required.

## API

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `/api/accounts` | CRUD accounts |
| `/api/categories` | CRUD categories |
| `/api/transactions` | CRUD with pagination and date filtering |
| `/api/recurring-rules` | CRUD recurring transaction rules |
| `/api/budgets` | CRUD budget limits |
| `/api/tags` | CRUD transaction tags |
| `/api/payees` | CRUD payees |
| `/api/goals` | CRUD savings goals + contributions |
| `/api/analytics/*` | Month summary, category breakdown, net worth, budget vs actual, recurring costs |
| `/api/export/*` | JSON/CSV export, JSON import |
| `/api/audit/*` | Audit log queries |
| `/api/docs` | Swagger UI |

## License

Private
