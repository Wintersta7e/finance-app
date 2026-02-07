#!/usr/bin/env bash
# Prepare backend for Electron packaging by creating a standalone node_modules
# with only production dependencies (not hoisted by npm workspaces).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$BACKEND_DIR/../.." && pwd)"
STAGING_DIR="$(mktemp -d)"

echo "=== Preparing production backend ==="
echo "Backend dir: $BACKEND_DIR"

# 1. Build TypeScript (run from root so workspace bins are on PATH)
echo "Building TypeScript..."
cd "$ROOT_DIR"
npm run build --workspace=packages/backend

# 2. Install production deps in isolated staging dir (outside workspace)
echo "Installing production dependencies..."
cp "$BACKEND_DIR/package.json" "$STAGING_DIR/"
cd "$STAGING_DIR"
npm install --omit=dev 2>&1

# 3. Copy standalone node_modules back
echo "Copying production node_modules..."
rm -rf "$BACKEND_DIR/node_modules_prod"
mv "$STAGING_DIR/node_modules" "$BACKEND_DIR/node_modules_prod"

# 4. Clean up
rm -rf "$STAGING_DIR"

echo "=== Production backend ready ==="
echo "  dist/              - compiled JavaScript"
echo "  node_modules_prod/ - production dependencies"
echo "  prisma/            - schema and migrations"
