#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Building backend (finance-backend)…"
(cd "${ROOT_DIR}/finance-backend" && ./mvnw clean package)

echo "Installing frontend deps and building desktop bundle (finance-desktop)…"
(cd "${ROOT_DIR}/finance-desktop" && npm ci && npm run build:desktop)

echo "Build complete. Backend JAR is in finance-backend/target, desktop artifacts in finance-desktop/dist."
