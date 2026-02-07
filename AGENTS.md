# Repository Guidelines

Concise guide for contributors working on this two-part repo: Spring Boot backend (`finance-backend`) and Vite/React desktop UI (`finance-desktop`).

## Project Structure & Module Organization
- `finance-backend/`: Spring Boot 4 / Java 21 service. Keep REST endpoints under `api`, DTOs under `api/dto`, domain/repositories under `domain`, services under `service`, startup wiring under `config`, resources under `src/main/resources`.
- `finance-desktop/`: Vite + React TypeScript desktop client. App entry in `src/main.tsx`/`src/App.tsx`; static assets in `public/`.
- Top-level `.gitignore` covers both projects; avoid adding nested ignores unless scoped to generated artifacts.

## Build, Test, and Development Commands
- Backend: from `finance-backend/`
  - `./mvnw clean test` – compile and run backend tests.
  - `./mvnw spring-boot:run` – start API on `http://127.0.0.1:8080` (health at `/api/health`); bound to loopback with CORS configured for local clients.
  - `./mvnw clean package` – produce runnable jar in `target/`.
- Frontend: from `finance-desktop/`
  - `npm install` (or `npm ci`) – install deps.
  - `npm run dev` – start Vite dev server.
  - `npm run dev:desktop` – start Vite and Electron together for desktop development.
  - `npm run electron` / `npm run electron:prod` – launch Electron in dev/prod mode (build before prod).
  - `npm run build` – type-check and build to `dist/`.
  - `npm run lint` – lint frontend sources.

## Coding Style & Naming Conventions
- Backend: Java 21, 4-space indent, same-line braces, no wildcard imports. Packages stay lowercase dotted (`rooty.finance.financebackend.*`). Controllers end with `Controller`, DTOs with `Dto`, repositories extend `JpaRepository`. Prefer Lombok and constructor injection; REST paths start with `/api` and return DTOs.
- Frontend: TypeScript/React with Vite. Follow functional components, hooks, and keep files PascalCase for components. Use ESLint defaults from repo.

## Testing Guidelines
- Backend: JUnit 5 with Spring Boot test starters. Co-locate tests as `*Tests`, covering happy paths and validation/errors; H2 is available for in-memory scenarios.
- Frontend: Add React Testing Library/Vitest as needed; keep tests alongside components (`*.test.tsx`).

## Commit & Pull Request Guidelines
- Repository was reinitialized; use clear, imperative commit messages (Conventional Commits encouraged).
- PRs should summarize changes, link issues, list tests run (`./mvnw test`, `npm run test`/`lint` if applicable), and include screenshots or payload samples for UI/API changes.
- Keep diffs focused; update docs/configs when altering startup, persistence, or API surfaces.
