#!/usr/bin/env bash
# Prepare backend for Electron packaging by creating a standalone node_modules
# with only production dependencies (not hoisted by npm workspaces).
#
# When running from WSL targeting Windows, uses cmd.exe for npm operations
# so native modules (better-sqlite3) get the correct platform binaries.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ROOT_DIR="$(cd "$BACKEND_DIR/../.." && pwd)"
STAGING_DIR="$BACKEND_DIR/staging"

# Detect if we're in WSL targeting a Windows mount
is_wsl_windows_mount() {
	[[ "$(uname -r)" == *microsoft* ]] && [[ "$BACKEND_DIR" == /mnt/* ]]
}

# Convert WSL path to Windows path for cmd.exe
to_win_path() {
	echo "$1" | sed 's|^/mnt/\(.\)|\U\1:|' | sed 's|/|\\|g'
}

echo "=== Preparing production backend ==="
echo "Backend dir: $BACKEND_DIR"

# 1. Build TypeScript (includes generated Prisma client in dist/)
echo "Building TypeScript..."
cd "$ROOT_DIR"
npm run build --workspace=packages/backend

# 2. Set up staging directory
rm -rf "$STAGING_DIR"
mkdir -p "$STAGING_DIR"
cp "$BACKEND_DIR/package.json" "$STAGING_DIR/"

# 3. Install production deps (includes @prisma/client, better-sqlite3, adapter)
# No need to run prisma generate — the generated client is compiled into dist/
if is_wsl_windows_mount; then
	WIN_STAGING="$(to_win_path "$STAGING_DIR")"
	echo "WSL detected on Windows mount — using cmd.exe for npm install"
	echo "Windows staging path: $WIN_STAGING"

	# Install production deps (Windows binaries for better-sqlite3)
	cmd.exe /c "cd /d $WIN_STAGING && npm install --omit=dev" 2>&1
else
	echo "Native environment — using npm directly"
	cd "$STAGING_DIR"
	npm install --omit=dev 2>&1
fi

# 4. Copy standalone node_modules back
echo "Copying production node_modules..."
rm -rf "$BACKEND_DIR/node_modules_prod"
mv "$STAGING_DIR/node_modules" "$BACKEND_DIR/node_modules_prod"

# 5. Clean up
rm -rf "$STAGING_DIR"

echo "=== Production backend ready ==="
echo "  dist/              - compiled JavaScript (includes generated Prisma client)"
echo "  node_modules_prod/ - production dependencies (better-sqlite3, @prisma/client)"
echo "  prisma/            - schema and migrations"
