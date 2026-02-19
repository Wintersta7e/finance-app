# Changelog

## [Unreleased]

### Added
- ESLint coverage for backend (`eslint.config.mjs` with typescript-eslint recommended)
- Root `npm run typecheck` script covering both packages
- Root `npm run lint` script covering both packages
- API client retry with exponential backoff for backend startup race condition

### Changed
- Backend TypeScript upgraded to full `strict: true` mode (was partial)
- Frontend ESLint config renamed to `.mjs` (eliminates ESM re-parse warning)
- Dev script now waits for backend health endpoint before opening Electron
- Upgraded Prisma 5.22 to 6.19
- Upgraded NestJS 11.1.13 to 11.1.14
- Upgraded Electron 40.2 to 40.6, electron-builder 26.7 to 26.8
- Upgraded globals 16.5 to 17.3, wait-on 8.0 to 9.0
- Upgraded typescript-eslint, @types/node, @types/react, @vitejs/plugin-react
- Removed unused @nestjs/cli and @nestjs/schematics (eliminated 120 packages)
- Vulnerabilities reduced from 60 to 19 (all remaining are dev-only minimatch ReDoS)

### Fixed
- Button `disabled` prop was cosmetic only — now actually disables the HTML element
- "Add rule" button clickable during loading (caused form to open with empty data)

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
