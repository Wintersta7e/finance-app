# @finance/backend

NestJS REST API with Prisma 7 + SQLite for the Finance Desktop app.

## Quick Start

```bash
npm run start:dev           # hot reload dev server (port 8080)
npx jest                    # run 201 tests
npx jest --coverage         # with coverage report
```

## Architecture

14 feature modules following a consistent pattern:

```
module.ts → controller.ts (/api prefix) → service.ts (Prisma) → dto/ (class-validator) → spec.ts
```

### Modules

| Module | Endpoints | Description |
|--------|-----------|-------------|
| accounts | `/api/accounts` | CRUD with soft delete, entity-in-use protection |
| analytics | `/api/analytics/*` | Month summary, category breakdown, net worth trend, budget vs actual, recurring costs |
| audit | `/api/audit/*` | Change tracking via global interceptor |
| budgets | `/api/budgets` | Per-category spending limits with effective dates |
| categories | `/api/categories` | Income/expense classification, fixed cost flag |
| export | `/api/export/*`, `/api/import/*` | JSON backup/restore, CSV transaction export |
| goals | `/api/goals` | Savings goals with contribution tracking |
| health | `/api/health` | Readiness check |
| payees | `/api/payees` | Transaction payee management |
| recurring-rules | `/api/recurring-rules` | Scheduled transactions with auto-posting |
| seed | — | Initial data setup |
| settings | `/api/settings` | Currency, first day of month/week |
| tags | `/api/tags` | Transaction labels with color |
| transactions | `/api/transactions` | Paginated CRUD with date/account/category filtering |

### Key Patterns

- **Soft delete** — `deletedAt` field, filtered with `where: { deletedAt: null }` in all queries
- **Entity-in-use protection** — check relations (including soft-delete filter) before deletion
- **UTC date boundaries** — `Date.UTC()` for all month/date range construction
- **DTO validation** — `@MaxLength` on all strings, `@Matches` on colors, `whitelist: true` globally
- **Typed Prisma queries** — `Prisma.*WhereInput`, `Prisma.*UncheckedUpdateInput` (no `any`)
- **Audit interceptor** — auto-logs CREATE/UPDATE/DELETE with entity type extraction

## Database

SQLite via Prisma 7 with `@prisma/adapter-better-sqlite3`.

```
prisma.config.ts        # Datasource URL configuration
prisma/schema.prisma    # Models, indexes, generator config
prisma/migrations/      # SQL migrations (applied by Electron main process)
src/generated/prisma/   # Auto-generated client (gitignored)
```

### Indexes

- Transaction: `(date, deletedAt)`, `(accountId, deletedAt)`, `(categoryId, deletedAt)`
- AuditLog: `(timestamp DESC)`, `(entityType, entityId)`

### Prisma 7 Import Paths

```typescript
// Models and types — from generated client
import { PrismaClient, Prisma } from '../../generated/prisma/client';

// Runtime types — from @prisma/client package
import { Decimal } from '@prisma/client/runtime/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
```

## Testing

201 tests across 18 suites using Jest with mocked PrismaService.

```bash
npx jest                    # all tests
npx jest --watch            # watch mode
npx jest --coverage         # coverage report
npx jest <module-name>      # single module
```

## API Documentation

Swagger UI available at `http://127.0.0.1:8080/api/docs` in development mode (gated behind `NODE_ENV !== 'production'`).
