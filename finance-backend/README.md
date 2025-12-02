# Finance Backend

Spring Boot 4 / Java 21 single-user finance backend that serves an Electron client over HTTP.

## Quick start
- Prerequisite: Java 21 available on `PATH`/`JAVA_HOME`.
- Run locally: `./mvnw spring-boot:run` (uses H2 file DB at `~/finance-app/data/finance-db`, exposes API on `http://127.0.0.1:8080`).
- Health check: `GET /api/health`.

## Developing
- Build and test: `./mvnw clean test`
- Package: `./mvnw clean package`
- H2 console (dev only): `http://127.0.0.1:8080/h2-console` with JDBC URL `jdbc:h2:file:~/finance-app/data/finance-db`.

## API surface
- Accounts: `/api/accounts` CRUD
- Categories: `/api/categories` CRUD
- Transactions: `/api/transactions?from=YYYY-MM-DD&to=YYYY-MM-DD` with CRUD
- Recurring rules: `/api/recurring-rules` CRUD and `/api/recurring-rules/{id}/generate-next`
- Budgets: `/api/budgets` CRUD
- Settings: `/api/settings` GET/PUT (single row)
- Analytics: `/api/analytics/month-summary`, `/category-breakdown`, `/net-worth-trend`, `/budget-vs-actual`

## Data defaults
On first boot, seeds a main account, common categories, and app settings (EUR, first day = 1). Entities and DTOs live under `rooty.finance.financebackend.domain` and `rooty.finance.financebackend.api.dto` respectively.
