# Architecture

## Overview
Electron shell hosting a Vite/React TypeScript frontend that communicates with the local Spring Boot backend (`http://127.0.0.1:8080/api`). Development loads the Vite dev server in Electron; production-like mode loads the built `dist/` assets.

## Runtime flow
- **Electron main (`electron/main.js`)** creates a `BrowserWindow`. In development it loads `http://localhost:5173` (Vite dev server) and opens devtools; in production it loads `dist/index.html`.
- **Renderer (React)** lives under `src/`, bootstrapped by `src/main.tsx`. `src/App.tsx` currently fetches `/api/health` and renders status/errors.
- **IPC/Node integration**: disabled (`nodeIntegration: false`, `contextIsolation: true`); renderer uses standard browser APIs to call the backend.

## Key directories
- `electron/` – main process code.
- `src/` – React components, entry (`main.tsx`), and app shell (`App.tsx`).
- `public/` – static assets copied into the build.
- `dist/` – Vite build output consumed by Electron in production mode.

## Scripts and tooling
- `dev:desktop`: runs Vite dev server and Electron together (via `concurrently` + `wait-on`).
- `electron` / `electron:prod`: launch Electron in dev or production-like mode.
- `build`: Vite build for the renderer.
- `lint`: ESLint over the project.

## Backend integration notes
- Base URL assumed: `http://127.0.0.1:8080/api`. Ensure backend CORS allows `localhost:5173` and Electron (file://) if stricter policies are added later.
- Next planned UI: Dashboard, Accounts, Transactions backed by real endpoints; keep API calls centralized for easier environment configuration.
