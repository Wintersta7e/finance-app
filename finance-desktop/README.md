# Finance Desktop (Electron + Vite + React)

Electron shell around the finance backend UI. The app talks to the Spring Boot service at `http://127.0.0.1:8080` and renders React screens via Vite.

## Prerequisites
- Node 20+
- Backend running locally (`mvn spring-boot:run` in `../finance-backend`)

## Install & run
- Install deps: `npm install`
- Dev (Vite + Electron): `npm run dev:desktop` (starts Vite on `http://localhost:5173`, waits, then launches Electron)
- Electron only against dev server: `npm run electron`
- Production-like Electron (loads built `dist/`): `npm run electron:prod` (requires `npm run build` first)
- Frontend-only:
  - `npm run dev` – Vite dev server
  - `npm run build` – Vite build
  - `npm run preview` – serve built assets

## API expectations
- Backend base URL: `http://127.0.0.1:8080/api`
- Current UI calls `/api/health`; upcoming work: Dashboard, Accounts, Transactions. Add CORS rules on the backend to allow `localhost:5173` and the Electron app.

## Project structure
- `electron/main.js` – Electron main process; loads Vite in dev or `dist/index.html` in prod.
- `src/App.tsx` – React entry; currently renders backend health status.
- `src/main.tsx` – Bootstraps React into the DOM.
- `public/` – static assets bundled by Vite.

## Scripts (package.json)
- `dev:desktop` – concurrently run Vite and Electron dev shell (waits for dev server).
- `electron` / `electron:prod` – launch Electron in dev/prod mode.
- `lint` – ESLint over the project.
