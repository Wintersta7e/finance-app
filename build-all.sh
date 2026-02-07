#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Preparing backend (packages/backend)…"
bash "${ROOT_DIR}/packages/backend/scripts/prepare-production.sh"

APP_VERSION="${APP_VERSION:-}"

echo "Installing frontend deps and building desktop bundle (packages/desktop)…"
(
  cd "${ROOT_DIR}/packages/desktop"
  npm ci
  npm run build
  if [ -n "${APP_VERSION}" ]; then
    echo "Packaging desktop with version ${APP_VERSION}…"
    npx electron-builder --config.extraMetadata.version="${APP_VERSION}"
  else
    npx electron-builder
  fi
)

echo "Build complete. Desktop artifacts in packages/desktop/dist."
