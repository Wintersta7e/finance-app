# Architecture

## Overview
The service is a layered Spring Boot 4 application (Java 21) that exposes a REST API for a single-user finance app. Data persists to an H2 file database (`~/finance-app/data/finance-db`) via Spring Data JPA.

## Layers and modules
- **API controllers (`rooty.finance.financebackend.api`)**: REST endpoints for accounts, categories, transactions, recurring rules, settings, analytics, and health. Controllers accept/return DTOs only.
- **DTOs and mapper (`api.dto`, `api.DtoMapper`)**: Records model JSON payloads and isolate REST from entities; mapper performs manual conversions.
- **Service (`service.AnalyticsService`)**: Aggregations for month summary, category breakdown, and net-worth trend, reusing repositories.
- **Domain & persistence (`domain`)**: JPA entities plus Spring Data repositories for all aggregates.
- **Config (`config.DataInitializer`)**: Seeds default settings, a main account, and baseline categories in an idempotent way at startup.

## Data and behavior
- **Entities**: Account, Category, Transaction, RecurringRule, AppSettings. Transaction types are string-based (`INCOME`, `FIXED_COST`, `VARIABLE_EXPENSE`, `TRANSFER`), with optional category for transfers and recurring linkage via `recurringRuleId`.
- **Recurring generation**: `RecurringRuleController` computes the next occurrence after today based on period (weekly/monthly/yearly), creates a Transaction with signed amount (income positive, expense negative), and links it back to the rule.
- **Analytics**:
  - Month summary: sums income, fixed costs, variable expenses for a month; computes savings and end-of-month balance (initial balances + transactions up to month end).
  - Category breakdown: expense totals per category for a YearMonth.
  - Net-worth trend: daily net worth from `from` to `to` using initial balances plus all transactions up to each day.

## Database and configuration
- Datasource, JPA, and server settings live in `src/main/resources/application.properties`.
- H2 console is enabled at `/h2-console`; Hibernate `ddl-auto=update` keeps schema in sync for development.

## Testing
- `FinanceBackendApplicationTests` sanity-checks context startup.
- `AnalyticsServiceTests` seeds sample data in-memory and validates month summary calculations.
