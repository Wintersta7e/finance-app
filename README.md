# Finance Monorepo

This repo contains two modules:
- **finance-backend** – Spring Boot 4 / Java 21 service providing REST APIs and H2 persistence.
- **finance-desktop** – Electron + Vite + React desktop client, bundled with the backend JAR (and optional JRE) for portable Windows usage.

## Prerequisites
- Node 20+
- Java 21 (for building the backend; packaged desktop can bundle its own JRE)

## Backend (finance-backend)
- Build/package: `cd finance-backend && ./mvnw clean package`
- Run in dev: `./mvnw spring-boot:run`
- API base: `http://127.0.0.1:8080/api`
- Default H2 DB: `jdbc:h2:file:~/finance-app/data/finance-db;AUTO_SERVER=TRUE` (override via `SPRING_DATASOURCE_URL`)

## Desktop (finance-desktop)
- Install deps: `cd finance-desktop && npm install`
- Dev (Vite + Electron): `npm run dev:desktop`
- Package Windows portable EXE (includes backend JAR + optional JRE):
  1. Ensure backend JAR exists at `../finance-backend/target/finance-backend-0.0.1-SNAPSHOT.jar` (`./mvnw clean package`).
  2. (Optional) Place a Windows JRE under `finance-desktop/jre/bin/java.exe` to bundle it; otherwise system `java` is used.
  3. `npm run build:desktop`
  4. Run `dist/Finance Desktop-<version>-portable.exe` (data stored next to the EXE in `data/`).
- Health check when running: `curl http://127.0.0.1:8080/api/health`

## Docs
- Desktop UI/design system and flows: `finance-desktop/UI.md`
