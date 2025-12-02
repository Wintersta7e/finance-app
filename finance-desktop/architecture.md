# Architecture

## Overview
Electron shell hosting a Vite/React TypeScript frontend that communicates with the local Spring Boot backend (`http://127.0.0.1:8080/api`). Development loads the Vite dev server in Electron; production-like mode loads the built `dist/` assets.

## Runtime flow
- **Electron main (`electron/main.js`)** creates a `BrowserWindow`. In development it loads `http://localhost:5173` (Vite dev server) and opens devtools; in production it loads `dist/index.html`, spawns the packaged Spring Boot JAR from `resources/backend/`, and uses a bundled Windows JRE (`resources/jre/bin/java.exe`). When built as a portable EXE, it stores the H2 database alongside the EXE in `data/` via `SPRING_DATASOURCE_URL`.
- **Renderer (React)** lives under `src/`, bootstrapped by `src/main.tsx`. `src/App.tsx` renders a sidebar layout and switches between Dashboard, Accounts, Transactions, Recurring Rules, Analytics (charts), and Budgets pages that fetch backend data (accounts, categories, transactions, recurring rules, budgets, analytics, settings).
- **IPC/Node integration**: disabled (`nodeIntegration: false`, `contextIsolation: true`); renderer uses standard browser APIs to call the backend.

## Key directories
- `electron/` – main process code.
- `src/api/` – base URL config, DTO typings, and a fetch wrapper for backend endpoints.
- `src/components/` – layout shell, navigation, and charts (Recharts).
- `src/pages/` – dashboard, accounts, transactions, recurring rules, analytics, and budgets views.
- `src/` – React entry (`main.tsx`) and app shell (`App.tsx`).
- `public/` – static assets copied into the build.
- `dist/` – Vite build output consumed by Electron in production mode.

## Scripts and tooling
- `dev:desktop`: runs Vite dev server and Electron together (via `concurrently` + `wait-on`).
- `electron` / `electron:prod`: launch Electron in dev or production-like mode.
- `build`: Vite build for the renderer.
- `build:desktop`: builds renderer and packages Electron app (electron-builder) bundling backend JAR via extraResources.
- `lint`: ESLint over the project.

## Backend integration notes
- Base URL assumed: `http://127.0.0.1:8080/api`. Backend CORS is already open for local Electron/Vite usage.
