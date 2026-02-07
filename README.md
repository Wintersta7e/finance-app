# Finance Monorepo

Personal finance tracking desktop application.

- **packages/backend** – NestJS / Prisma / SQLite REST API
- **packages/desktop** – Electron + Vite + React TypeScript desktop client

## Prerequisites
- Node 20+

## Quick Start (development)

```bash
npm install              # Install all workspace dependencies
npm run dev:backend      # Start backend with hot reload (port 8080)
npm run dev:desktop      # Start Vite + Electron desktop app
```

Or run both together:
```bash
npm run dev
```

## Build

### Full desktop build
```bash
bash build-all.sh
# Optional version override:
APP_VERSION=1.0.0 bash build-all.sh
```

Output: `packages/desktop/dist/Finance Desktop-<version>-portable.exe`

### Backend only
```bash
npm -w @finance/backend run build     # TypeScript compilation
npm -w @finance/backend run test      # Run 201 tests
```

### Frontend only
```bash
npm -w @finance/desktop run build     # Vite build
npm -w @finance/desktop run lint      # ESLint
```

## API
- Base URL: `http://127.0.0.1:8080/api`
- Swagger docs: `http://127.0.0.1:8080/api/docs`
- Health check: `GET /api/health`

## Docs
- `packages/desktop/UI.md` – Design system and component patterns
- `packages/desktop/USER_GUIDE.md` – End-user documentation
- `docs/plans/` – Architecture and implementation plans
