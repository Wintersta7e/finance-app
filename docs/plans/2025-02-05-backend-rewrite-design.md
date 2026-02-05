# Backend Rewrite: Java/Spring to Node.js/NestJS

**Date:** 2025-02-05
**Status:** Ready for Implementation

## Overview

Rewrite the finance-backend from Java/Spring Boot to Node.js/NestJS, making it professional and commercial-ready while simplifying the build process for Windows users.

## Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Distribution model | Flexible (desktop-first, cloud-ready) | Start with SQLite/desktop, architecture supports PostgreSQL/cloud later |
| Framework | NestJS | Enterprise-grade, familiar to Spring developers, enforced structure |
| ORM | Prisma | Best TypeScript integration, auto-generated types, built-in studio |
| Database | SQLite (now) / PostgreSQL (later) | Embedded for desktop, scalable for cloud |
| Project structure | Monorepo (`packages/`) | Clean separation, shared types possible |
| Auth | Single user now, multi-user later | Keep it simple for v1 |
| Testing | Comprehensive (~80% coverage) | Critical for financial software |

## Features for v1

### Core (from Java backend)
- [ ] Full API parity with Java backend
- [ ] Data export/import (JSON/CSV)
- [ ] API documentation (OpenAPI/Swagger)
- [ ] Audit logging (track changes)
- [ ] Comprehensive test suite (~80% coverage)

### New in v1
- [ ] **Tags** - Multiple tags per transaction (flexible categorization)
- [ ] **Soft delete** - Recoverable deletes across all entities
- [ ] **Payees** - Track merchants/payees separately from categories
- [ ] **Savings goals** - Set targets with progress tracking
- [ ] **Pagination** - For large transaction lists

## Backlog (Post-v1)

### Data Model Enhancements
- [ ] Split transactions (one transaction → multiple categories)
- [ ] Transfer linking (link both sides of a transfer)
- [ ] Attachments (receipt photos/PDFs)
- [ ] Reconciliation (mark transactions as reconciled)

### Features
- [ ] Auto-categorization rules ("If notes contain X → category Y")
- [ ] Transaction templates (quick-add presets)
- [ ] Duplicate detection (warn on similar transactions)
- [ ] Full-text search (search by notes, payee, amount)

### Infrastructure
- [ ] Multi-user authentication (JWT)
- [ ] Cloud deployment option (PostgreSQL)
- [ ] Data sync between devices

---

## 1. Project Structure

```
/packages
  /backend                    # NestJS + Prisma
    /src
      /modules
        /accounts             # Account CRUD
        /categories           # Category CRUD
        /transactions         # Transaction CRUD + date filtering
        /recurring-rules      # Rules + auto-posting logic
        /budgets              # Budget CRUD
        /settings             # App settings (singleton)
        /analytics            # Aggregations, reports
        /audit                # Audit log service
        /export               # Import/export JSON/CSV
        /health               # Health check endpoint
        /tags                 # NEW: Tag management
        /payees               # NEW: Payee/merchant tracking
        /goals                # NEW: Savings goals
      /common
        /decorators           # Custom decorators
        /filters              # Exception filters
        /interceptors         # Logging, audit interceptors
        /pipes                # Validation pipes
      /prisma                 # Prisma service, migrations
      main.ts                 # Entry point
    /test
      /unit                   # Unit tests (*.spec.ts)
      /integration            # API tests (*.e2e-spec.ts)
      /fixtures               # Test data factories
    prisma/
      schema.prisma           # Database schema
      migrations/             # Version-controlled migrations
    package.json
    tsconfig.json
    nest-cli.json

  /desktop                    # (future: move finance-desktop here)
  /shared                     # (future: shared TypeScript types)
```

**Key points:**
- Each domain has its own NestJS module (controller + service + DTOs)
- Common utilities shared across modules
- Prisma schema is the source of truth for DB
- Tests organized by type (unit vs integration)

---

## 2. Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"  // Switch to "postgresql" for cloud
  url      = env("DATABASE_URL")
}

// ============================================
// CORE ENTITIES
// ============================================

model Account {
  id             Int           @id @default(autoincrement())
  name           String
  type           String        @default("CHECKING")
  initialBalance Decimal       @default(0)
  archived       Boolean       @default(false)
  deletedAt      DateTime?     // Soft delete
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  transactions   Transaction[]
  recurringRules RecurringRule[]
}

model Category {
  id        Int       @id @default(autoincrement())
  name      String
  kind      String    // "INCOME" | "EXPENSE"
  fixedCost Boolean   @default(false)
  deletedAt DateTime? // Soft delete
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  transactions   Transaction[]
  recurringRules RecurringRule[]
  budgets        Budget[]
}

model Transaction {
  id              Int       @id @default(autoincrement())
  date            DateTime  @db.Date
  amount          Decimal   // Signed: positive=income, negative=expense
  type            String    // "INCOME" | "FIXED_COST" | "VARIABLE_EXPENSE" | "TRANSFER"
  notes           String?
  recurringRuleId Int?      // Links to rule that created this (if auto-posted)
  deletedAt       DateTime? // Soft delete
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  account    Account   @relation(fields: [accountId], references: [id])
  accountId  Int
  category   Category? @relation(fields: [categoryId], references: [id])
  categoryId Int?
  payee      Payee?    @relation(fields: [payeeId], references: [id])
  payeeId    Int?
  tags       TransactionTag[]
}

model RecurringRule {
  id             Int       @id @default(autoincrement())
  amount         Decimal
  direction      String    // "INCOME" | "EXPENSE"
  period         String    // "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
  startDate      DateTime  @db.Date
  endDate        DateTime? @db.Date
  nextOccurrence DateTime  @db.Date
  autoPost       Boolean   @default(true)
  note           String?
  deletedAt      DateTime? // Soft delete
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  account    Account   @relation(fields: [accountId], references: [id])
  accountId  Int
  category   Category? @relation(fields: [categoryId], references: [id])
  categoryId Int?
  payee      Payee?    @relation(fields: [payeeId], references: [id])
  payeeId    Int?
}

model Budget {
  id            Int       @id @default(autoincrement())
  amount        Decimal
  period        String    @default("MONTHLY")
  effectiveFrom DateTime  @db.Date
  effectiveTo   DateTime? @db.Date
  deletedAt     DateTime? // Soft delete
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  category   Category @relation(fields: [categoryId], references: [id])
  categoryId Int
}

model AppSettings {
  id              Int      @id @default(1)
  currencyCode    String   @default("EUR")
  firstDayOfMonth Int      @default(1)
  firstDayOfWeek  Int      @default(1)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

// ============================================
// NEW IN V1: Tags, Payees, Savings Goals
// ============================================

model Tag {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  color     String?   // Hex color for UI (e.g., "#FF5733")
  deletedAt DateTime? // Soft delete
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  transactions TransactionTag[]
}

model TransactionTag {
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  transactionId Int
  tag           Tag         @relation(fields: [tagId], references: [id], onDelete: Cascade)
  tagId         Int

  @@id([transactionId, tagId])
}

model Payee {
  id        Int       @id @default(autoincrement())
  name      String    @unique
  notes     String?   // e.g., "Online retailer"
  deletedAt DateTime? // Soft delete
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  transactions   Transaction[]
  recurringRules RecurringRule[]
}

model SavingsGoal {
  id           Int       @id @default(autoincrement())
  name         String    // e.g., "Vacation to Japan"
  targetAmount Decimal   // Target amount to save
  currentAmount Decimal  @default(0) // Could be computed or manually updated
  targetDate   DateTime? @db.Date    // Optional deadline
  color        String?   // Hex color for UI
  deletedAt    DateTime? // Soft delete
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

// ============================================
// SYSTEM
// ============================================

model AuditLog {
  id         Int      @id @default(autoincrement())
  entityType String   // "Account" | "Transaction" | etc.
  entityId   Int
  action     String   // "CREATE" | "UPDATE" | "DELETE"
  changes    String?  // JSON diff of what changed
  timestamp  DateTime @default(now())
}
```

**Key additions for v1:**
- `deletedAt` on all entities (soft delete - null means active)
- `Tag` with many-to-many relation to transactions via `TransactionTag`
- `Payee` for merchant tracking (linked to transactions and recurring rules)
- `SavingsGoal` with target amount, current progress, optional deadline
- Proper foreign key relations with cascading deletes where appropriate

**Notes:**
- `createdAt`/`updatedAt` on all entities for audit trail
- `AuditLog` table stores all changes for compliance
- SQLite for now, one-line change to PostgreSQL later
- All queries should filter `WHERE deletedAt IS NULL` by default

---

## 3. API Endpoints

All endpoints prefixed with `/api`. Full OpenAPI docs auto-generated at `/api/docs`.

### Core CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/accounts` | List all accounts |
| POST | `/api/accounts` | Create account |
| PUT | `/api/accounts/:id` | Update account |
| DELETE | `/api/accounts/:id` | Delete (409 if has transactions) |
| GET | `/api/categories` | List all categories |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/:id` | Update category |
| DELETE | `/api/categories/:id` | Delete (409 if in use) |
| GET | `/api/transactions` | List transactions (`?from=&to=` required) |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/recurring-rules` | List all rules |
| POST | `/api/recurring-rules` | Create rule |
| PUT | `/api/recurring-rules/:id` | Update rule |
| DELETE | `/api/recurring-rules/:id` | Delete rule |
| POST | `/api/recurring-rules/:id/generate-next` | Manually trigger next transaction |
| GET | `/api/budgets` | List all budgets |
| POST | `/api/budgets` | Create budget |
| PUT | `/api/budgets/:id` | Update budget |
| DELETE | `/api/budgets/:id` | Delete budget |
| GET | `/api/settings` | Get app settings |
| PUT | `/api/settings` | Update settings |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/month-summary` | Income, expenses, savings for month |
| GET | `/api/analytics/category-breakdown` | Spending by category |
| GET | `/api/analytics/net-worth-trend` | Daily balance over date range |
| GET | `/api/analytics/budget-vs-actual` | Budget comparison |
| GET | `/api/analytics/recurring-costs` | Monthly recurring cost total |

### Tags (NEW)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tags` | List all tags |
| POST | `/api/tags` | Create tag |
| PUT | `/api/tags/:id` | Update tag |
| DELETE | `/api/tags/:id` | Soft delete tag |

### Payees (NEW)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payees` | List all payees (with pagination) |
| POST | `/api/payees` | Create payee |
| PUT | `/api/payees/:id` | Update payee |
| DELETE | `/api/payees/:id` | Soft delete payee |

### Savings Goals (NEW)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/goals` | List all savings goals |
| POST | `/api/goals` | Create goal |
| PUT | `/api/goals/:id` | Update goal (including progress) |
| DELETE | `/api/goals/:id` | Soft delete goal |
| POST | `/api/goals/:id/contribute` | Add contribution to goal |

### Export/Import

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/export/json` | Export all data as JSON |
| GET | `/api/export/csv/transactions` | Export transactions as CSV |
| POST | `/api/import/json` | Import data from JSON backup |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/docs` | Swagger UI |

### Pagination

All list endpoints support pagination via query parameters:
- `?page=1&limit=50` - Page-based pagination
- `?cursor=abc&limit=50` - Cursor-based pagination (for large datasets)

Transactions endpoint specifically:
- `GET /api/transactions?from=2025-01-01&to=2025-01-31&page=1&limit=100`

---

## 4. Module Design (NestJS)

Each module follows the same structure:

```
/modules/transactions/
  transactions.module.ts      # Module definition, imports/exports
  transactions.controller.ts  # REST endpoints
  transactions.service.ts     # Business logic
  dto/
    create-transaction.dto.ts # Input validation (POST)
    update-transaction.dto.ts # Input validation (PUT)
    transaction.dto.ts        # Response shape
    transaction-query.dto.ts  # Query params (?from, ?to, ?page)
```

**Module wiring pattern:**
- Each module imports `PrismaModule` and `AuditModule`
- Services are exported for cross-module use (e.g., Analytics uses TransactionsService)
- Controllers use decorators for Swagger documentation (`@ApiTags`, `@ApiQuery`)

---

## 5. Services & Business Logic

### 5.1 RecurringScheduleService
- `computeNextDate(current, period)` - Advances date by period (DAILY/WEEKLY/MONTHLY/YEARLY)
- `nextOccurrenceOnOrAfter(reference, startDate, period)` - Finds next occurrence on or after reference date
- Safety guard: max 500 iterations to prevent infinite loops

### 5.2 RecurringAutoPostService
- Runs on startup + daily cron at 3:05 AM
- Creates transactions from due recurring rules
- Updates `nextOccurrence` after posting
- Respects `endDate` - stops if exceeded
- Normalizes amounts: EXPENSE = negative, INCOME = positive

### 5.3 AnalyticsService
- `getMonthSummary(year, month)` - Aggregates income, fixed costs, variable expenses, savings
- `getNetWorthTrend(from, to)` - Daily balance points over date range
- `getCategoryBreakdown(year, month)` - Spending grouped by category
- `getBudgetVsActual(year, month)` - Compares budgets vs actual spending
- `getRecurringCostSummary()` - Monthly equivalent of all recurring expenses
- `calculateBalanceUpTo(date)` - Sum of initial balances + all transactions up to date

---

## 6. Error Handling

### Standard Error Response
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Cannot delete account with existing transactions",
  "timestamp": "2025-02-05T14:30:00.000Z",
  "path": "/api/accounts/1"
}
```

### Custom Exceptions
- `EntityInUseException` (409) - Cannot delete entity with dependencies
- `EntityNotFoundException` (404) - Entity not found
- `ValidationFailedException` (400) - DTO validation errors

### Global Exception Filter
- Catches all exceptions
- Handles Prisma errors (unique constraint, FK violation, not found)
- Consistent response format across all errors

### Validation Pipe
- `whitelist: true` - Strip unknown properties
- `forbidNonWhitelisted: true` - Throw on unknown properties
- `transform: true` - Auto-transform types

---

## 7. Audit Logging

### AuditService
- `log(entityType, entityId, action, changes, previousState)` - Creates audit entry
- `computeDiff(previous, current)` - Calculates field-level changes for UPDATE
- `getHistory(entityType, entityId)` - Returns audit trail for entity
- `getRecentActivity(limit)` - Returns recent changes across all entities

### What Gets Logged
| Action | Data Stored |
|--------|-------------|
| CREATE | Full object |
| UPDATE | Changed fields with from/to values |
| DELETE | Soft delete marker |

### Audit API
- `GET /api/audit/recent?limit=50` - Recent activity
- `GET /api/audit/:entityType/:entityId` - History for specific entity

---

## 8. Testing Strategy

### Structure
```
/test
  /unit           # Fast, isolated service tests
  /integration    # API tests with real DB
  /fixtures       # Test data factories
```

### Test Fixtures Factory
- `Factory.account(overrides?)` - Generate test account
- `Factory.transaction(overrides?)` - Generate test transaction
- `Factory.recurringRule(overrides?)` - Generate test rule
- Uses `@faker-js/faker` for realistic data

### Coverage Targets
| Area | Target |
|------|--------|
| Services | 90% |
| Controllers | 70% |
| Utils/Helpers | 95% |
| **Overall** | **80%** |

### NPM Scripts
- `npm test` - Run unit tests
- `npm run test:e2e` - Run integration tests
- `npm run test:cov` - Coverage report
- `npm run test:all` - Full test suite

---

## 9. Electron Integration

### Architecture
- Electron main process spawns NestJS as child process (production)
- Backend runs as `node backend/dist/main.js`
- No JRE needed - Node.js bundled with Electron
- Renderer connects via `http://localhost:8080/api`

### Database Locations
| Mode | Path |
|------|------|
| Development | `packages/backend/prisma/dev.db` |
| Installed | `%APPDATA%/Finance Desktop/data/finance.db` |
| Portable | `./data/finance.db` (next to exe) |

### Backend Lifecycle
- Main process forks backend with `DATABASE_URL` env var
- Backend signals ready via IPC message
- Main process waits for ready before showing window
- Backend killed on app quit

### Dev Workflow
```bash
# Terminal 1: Backend with hot reload
cd packages/backend && npm run start:dev

# Terminal 2: Frontend + Electron
cd packages/desktop && npm run dev:desktop
```

---

## 10. Build & Packaging

### Before vs After
| Aspect | Java Version | Node.js Version |
|--------|--------------|-----------------|
| Tools needed | Node + Java + Maven | Node only |
| JRE bundle | ~200MB manual | Not needed |
| Total size | ~250MB | ~80-100MB |

### Root Package Scripts
```bash
npm run dev          # Backend + frontend + Electron (dev mode)
npm run build        # Build everything
npm run test         # Run all tests
npm run lint         # Lint all packages
```

### One-Command Build
```bash
npm run build
# Output in packages/desktop/release/
#   ├── Finance-1.0.0-x64.exe     (installer)
#   ├── Finance-1.0.0-portable.exe
#   └── Finance-1.0.0-x64.dmg     (macOS)
```

### Electron Builder Config
- Bundles `backend/dist`, `backend/node_modules`, `backend/prisma`
- Outputs: Windows (portable + NSIS), macOS (DMG), Linux (AppImage)

---

## Migration Plan

### Phase 1: Setup (Day 1)
1. Create `packages/` directory structure
2. Initialize NestJS project in `packages/backend`
3. Set up Prisma with SQLite
4. Create root package.json with workspaces
5. Configure TypeScript, ESLint, Prettier

### Phase 2: Core Entities (Day 2-3)
1. Define Prisma schema (all models)
2. Generate Prisma client
3. Create PrismaService
4. Implement modules: accounts, categories, settings
5. Add basic CRUD with soft delete
6. Unit tests for services

### Phase 3: Transactions & Rules (Day 4-5)
1. Implement transactions module with pagination
2. Implement recurring-rules module
3. Port RecurringScheduleService logic
4. Port RecurringAutoPostService logic
5. Add scheduled job (cron)
6. Integration tests

### Phase 4: Analytics & New Features (Day 6-7)
1. Implement analytics module (port all calculations)
2. Implement budgets module
3. Add tags, payees, goals modules
4. Implement export/import
5. Integration tests

### Phase 5: Infrastructure (Day 8)
1. Implement AuditService + interceptor
2. Add global exception filter
3. Set up Swagger documentation
4. Add health check endpoint

### Phase 6: Electron Integration (Day 9)
1. Update electron/main.js to spawn Node backend
2. Test database paths (dev, installed, portable)
3. Test startup/shutdown lifecycle
4. Remove JRE folder and Java references

### Phase 7: Testing & Polish (Day 10)
1. Achieve 80% test coverage
2. Test full build pipeline
3. Test on Windows, verify portable mode
4. Update documentation

### Phase 8: Cleanup
1. Delete `finance-backend/` (Java)
2. Move `finance-desktop/` to `packages/desktop/`
3. Update root README
4. Final commit

