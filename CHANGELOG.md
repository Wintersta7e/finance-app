# Changelog

## [2.0.0] - 2026-04-08

### Added
- **Complete UI rewrite** — 13 pages rebuilt with Tailwind CSS 4 + Framer Motion "Neon Pulse" dark theme
- New component library: SidePanel, CommandPalette, CommandStrip, SparkBars, SparkLine, OrbitalRing, GlowBar, MetricStrip, InsightBlock, DateGroupedList, Toast, DropdownMenu, EmptyState, PillChip, ErrorBoundary
- App shell with SplashScreen, health gate, command strip sidebar router
- Command Palette (`Ctrl+K`) for quick page/action navigation
- Tags, Payees, Goals, Export/Import, Audit, Settings pages
- Database indexes on Transaction (date, accountId, categoryId) and AuditLog (timestamp, entityType)
- Backend README with module table and Prisma 7 guide
- CI workflow (typecheck, lint, test, build), Release workflow (portable EXE on `v*` tags)
- Dependabot for weekly npm + GitHub Actions updates
- npm overrides for lodash, path-to-regexp, @hono/node-server vulnerability mitigation

### Changed
- **Prisma 6 → 7** — driver adapter pattern with `@prisma/adapter-better-sqlite3`, `prisma.config.ts`, generated client at `src/generated/prisma/`
- **TypeScript 5 → 6** — removed deprecated `baseUrl`, explicit jest types in ts-jest config
- **Electron 40 → 41** — Chromium 136, Node 24
- **Vite 7 → 8** — Rolldown bundler (2x faster builds)
- **ESLint 9 → 10**, @eslint/js 10, eslint-plugin-react-refresh 0.5
- **@vitejs/plugin-react 5 → 6**
- **cross-env 7 → 10**, @types/supertest 7, class-validator 0.15
- Backend binds to `127.0.0.1` only (was `0.0.0.0`)
- Import endpoint has 52MB server-side body size limit
- All DTO string fields now have `@MaxLength()` validation
- Goal color field validated with hex regex (matches tags pattern)
- `calculateBalanceUpTo` uses `account.aggregate` instead of `findMany` + loop
- Auto-post processes each recurring rule in its own `$transaction` (independent failure)
- Audit interceptor logs failures at warn level instead of swallowing silently
- HttpExceptionFilter joins validation message arrays into semicolon-separated string
- Migration runner in `electron/main.js` uses Prisma 7 adapter pattern
- `prepare-production.sh` simplified — no longer runs `prisma generate` (compiled to dist by tsc)
- All READMEs updated for current stack

### Fixed
- **UTC date boundaries** — all analytics methods use `Date.UTC()` instead of local-time constructors; prevents month boundary misattribution for non-UTC users
- **Pagination broken** — frontend expected `{ data, total }` but backend returned `{ data, meta: { total } }`; "Load more" button never appeared
- **Transaction list race condition** — replaced `loadingRef` mutex with generation counter; prevents stale data overwriting fresh results after mutations
- **Tag deletion blocked by soft-deleted transactions** — in-use check now filters `transaction.deletedAt: null`
- **`RecurringRuleUpdateInput` crash** — changed to `UncheckedUpdateInput` for scalar FK field compatibility
- **`useCategories` missing unmount guard** — added `useIsMounted()` consistent with all other hooks
- **CommandPalette timer leak** — `setTimeout` now cleaned up on unmount
- **AccountsPage type mismatch** — sends uppercase account type to match backend validation
- **AccountsPage save button flicker** — validation moved before `setSaving(true)`
- **Dashboard/Budgets UTC dates** — `getUTCFullYear()`/`getUTCMonth()` for API date params near midnight
- **Electron IPC listener leak** — backend ready listener changed to `.once()`
- **Frontend net-worth trend dates** — UTC construction for `from`/`to` parameters
- Import validation extended to cover tags and payees arrays
- Vulnerabilities reduced from 18 to 6 (all residual in dev/build transitive deps)

### Removed
- Old UI components: Layout, theme.ts, chart wrappers, Button, Card, Modal, FormField, Page, QuickTransactionForm
- `baseUrl` from backend tsconfig (deprecated in TypeScript 6)
- Platform-specific Prisma query engine binaries (replaced by WASM compiler + better-sqlite3)

## [1.1.0] - 2026-02-07

### Added
- NestJS backend rewrite — complete replacement of Java/Spring Boot backend
- 12 feature modules: accounts, categories, transactions, recurring-rules, analytics, budgets, tags, payees, goals, export/import, audit, seed
- 201 unit tests with 82% statement coverage
- Swagger API documentation at `/api/docs`
- DecimalSerializerInterceptor for Prisma Decimal to JS number conversion
- GlobalExceptionFilter with error logging
- Production build pipeline (`build-all.sh`) for portable Windows EXE

### Changed
- Backend rewritten from Java/Spring Boot to NestJS/Prisma/SQLite
- Frontend API client aligned with NestJS backend contract
- Date display fixed across all tables and edit forms
- Budget edit uses explicit field picking (prevents 400 errors)
- FIXED_COST transaction type mapping uses category.fixedCost flag

### Fixed
- DTO date validation: `@Type(() => Date)` + `@IsDate()` instead of `@IsDateString()`
- API client query params, pagination unwrap, and limit cap
- Frontend type field names to match backend responses
- NetWorthChart dataKey alignment

## [1.0.0] - 2026-01-15

### Added
- Initial Electron + React desktop application
- Dashboard with monthly summary, category breakdown, net worth chart
- Transaction management with date filtering and pagination
- Category management with income/expense classification
- Recurring rules with auto-post support
- Budget tracking with category assignment
- Analytics: month summary, category breakdown, net worth trend, budget vs actual
- Dark theme UI with custom design system
