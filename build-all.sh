#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Building backend (finance-backend)…"
(cd "${ROOT_DIR}/finance-backend" && ./mvnw clean package)

APP_VERSION="${APP_VERSION:-}"

echo "Installing frontend deps and building desktop bundle (finance-desktop)…"
(
  cd "${ROOT_DIR}/finance-desktop"
  npm ci
  npm run build
  if [ -n "${APP_VERSION}" ]; then
    echo "Packaging desktop with version ${APP_VERSION}…"
    npx electron-builder --config.extraMetadata.version="${APP_VERSION}"
  else
    npx electron-builder
  fi
)

echo "Build complete. Backend JAR is in finance-backend/target, desktop artifacts in finance-desktop/dist."
