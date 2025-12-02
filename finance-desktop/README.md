# Finance Desktop (Electron + Vite + React)

Electron shell around the finance backend UI. The app talks to the Spring Boot service at `http://127.0.0.1:8080` and renders React screens via Vite.

## Prerequisites
- Node 20+
- Backend running locally (`mvn spring-boot:run` in `../finance-backend`) or packaged JAR in `../finance-backend/target/`

## Install & run
- Install deps: `npm install`
- Dev (Vite + Electron): `npm run dev:desktop` (starts Vite on `http://localhost:5173`, waits, then launches Electron)
- Electron only against dev server: `npm run electron`
- Production-like Electron (loads built `dist/`): `npm run electron:prod` (requires `npm run build` first)
- Package Windows portable desktop (bundles backend JAR + JRE): `npm run build:desktop`
  - Before packaging, place a Windows JRE/JDK under `jre/` (e.g. `jre/bin/java.exe`).
  - Ensure the backend jar exists at `../finance-backend/target/finance-backend-0.0.1-SNAPSHOT.jar`.
  - Output: `dist/Finance Desktop-<version>-portable.exe`. All data is stored next to the EXE in `data/`.
- Frontend-only:
  - `npm run dev` – Vite dev server
  - `npm run build` – Vite build
  - `npm run preview` – serve built assets

## API expectations
- Backend base URL: `http://127.0.0.1:8080/api`
- Current UI calls accounts, categories, transactions, recurring rules, budgets, analytics (month summary, category breakdown, net worth trend, budget vs actual), and settings. Backend CORS already allows local Electron/Vite clients.

## Project structure
- `electron/main.js` – Electron main process; loads Vite in dev or `dist/index.html` in prod; spawns bundled backend JAR via bundled JRE when packaged and points Spring to a data folder next to the portable EXE.
- `src/main.tsx` – Bootstraps React into the DOM.
- `src/App.tsx` – Page shell; switches between Dashboard, Accounts, Transactions, Recurring, Analytics, and Budgets.
- `src/components/Layout.tsx` – Sidebar layout and navigation; chart components under `src/components/charts/`.
- `src/pages/` – dashboard, accounts, transactions, recurring rules, analytics (charts), budgets.
- `src/api/` – `config.ts` (base URL), `types.ts` (DTOs), `client.ts` (fetch helpers for backend endpoints).
- `public/` – static assets bundled by Vite.

## Scripts (package.json)
- `dev:desktop` – concurrently run Vite and Electron dev shell (waits for dev server).
- `electron` / `electron:prod` – launch Electron in dev/prod mode.
- `lint` – ESLint over the project.
