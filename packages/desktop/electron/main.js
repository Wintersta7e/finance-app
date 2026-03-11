const { app, BrowserWindow, dialog } = require('electron');
const path = require('node:path');
const { fork } = require('node:child_process');
const fs = require('node:fs');
const crypto = require('node:crypto');

const isDev = !app.isPackaged;
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const forceDevTools = process.argv.includes('--dev');

const BACKEND_READY_TIMEOUT_MS = 15_000;

/** Regex for valid Prisma migration directory names: YYYYMMDDHHmmss_snake_case */
const MIGRATION_DIR_RE = /^\d{14}_\w+$/;

let backendProc = null;
let isQuitting = false;
let logStream = null;

function initLogFile() {
  if (isDev) return;
  try {
    const logDir = path.join(getDataDir());
    fs.mkdirSync(logDir, { recursive: true });
    const logPath = path.join(logDir, 'app.log');
    logStream = fs.createWriteStream(logPath, { flags: 'a' });
    logStream.write(`\n--- App started at ${new Date().toISOString()} ---\n`);
  } catch {
    // Logging is best-effort
  }
}

function log(level, ...args) {
  const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
  const line = `[${new Date().toISOString()}] [${level}] ${msg}`;
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
  if (logStream) {
    logStream.write(line + '\n');
  }
}

function getDataDir() {
  const exeDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (exeDir) {
    return path.join(exeDir, 'data');
  }
  return path.join(app.getPath('userData'), 'data');
}

function getBackendRoot() {
  return path.join(process.resourcesPath, 'backend');
}

/**
 * Returns the path to the PID file used to track the backend process.
 */
function getPidFilePath() {
  return path.join(getDataDir(), 'backend.pid');
}

/**
 * Write the backend process PID to disk so we can detect orphans on next launch.
 */
function writePidFile(pid) {
  try {
    const pidPath = getPidFilePath();
    fs.mkdirSync(path.dirname(pidPath), { recursive: true });
    fs.writeFileSync(pidPath, String(pid), 'utf-8');
  } catch (err) {
    log('warn', 'Failed to write PID file:', err.message);
  }
}

/**
 * Remove the PID file on clean exit.
 */
function cleanupPidFile() {
  try {
    const pidPath = getPidFilePath();
    if (fs.existsSync(pidPath)) {
      fs.unlinkSync(pidPath);
    }
  } catch (err) {
    log('warn', 'Failed to cleanup PID file:', err.message);
  }
}

/**
 * Check for a stale backend PID from a previous crash and kill it.
 */
function killStalePid() {
  try {
    const pidPath = getPidFilePath();
    if (!fs.existsSync(pidPath)) return;

    const pid = parseInt(fs.readFileSync(pidPath, 'utf-8').trim(), 10);
    if (isNaN(pid)) {
      fs.unlinkSync(pidPath);
      return;
    }

    // Check if the process is still running
    try {
      process.kill(pid, 0); // Signal 0: existence check, does not kill
      log('warn', `Killing stale backend process PID=${pid}`);
      process.kill(pid, 'SIGKILL');
    } catch {
      // Process doesn't exist — stale PID file
    }

    fs.unlinkSync(pidPath);
  } catch (err) {
    log('warn', 'Error checking stale PID:', err.message);
  }
}

/**
 * Checks whether a SQL string contains semicolons inside quoted strings,
 * which would break the naive split-on-semicolon approach.
 *
 * Returns true if a suspicious semicolon-in-string is detected.
 */
function hasSemicolonInQuotedString(sql) {
  // Walk character by character tracking quote state
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'" && !inDouble) {
      if (inSingle && sql[i + 1] === "'") { i++; } // skip escaped quote ''
      else { inSingle = !inSingle; }
    } else if (ch === '"' && !inSingle) {
      if (inDouble && sql[i + 1] === '"') { i++; } // skip escaped quote ""
      else { inDouble = !inDouble; }
    } else if (ch === ';' && (inSingle || inDouble)) {
      return true;
    }
  }
  return false;
}

async function runMigrations(dbUrl) {
  const backendRoot = getBackendRoot();
  const migrationsDir = path.join(backendRoot, 'prisma', 'migrations');

  if (!fs.existsSync(migrationsDir)) {
    log('warn', 'Migrations directory not found at', migrationsDir);
    return;
  }

  const clientPath = path.join(backendRoot, 'node_modules', '@prisma', 'client');
  let PrismaClient;
  try {
    PrismaClient = require(clientPath).PrismaClient;
  } catch (err) {
    // CR-05: Let the error propagate so startBackend rejects
    throw new Error(`Failed to load PrismaClient for migrations: ${err.message}`);
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: [],
  });

  try {
    await prisma.$connect();

    // Create Prisma migrations tracking table (compatible with prisma migrate deploy)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" TEXT PRIMARY KEY NOT NULL,
        "checksum" TEXT NOT NULL,
        "finished_at" DATETIME,
        "migration_name" TEXT NOT NULL,
        "logs" TEXT,
        "rolled_back_at" DATETIME,
        "started_at" DATETIME NOT NULL DEFAULT current_timestamp,
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )
    `);

    // Get already-applied migrations
    const applied = await prisma.$queryRawUnsafe(
      'SELECT "migration_name" FROM "_prisma_migrations" WHERE "rolled_back_at" IS NULL',
    );
    const appliedNames = new Set(applied.map((r) => r.migration_name));

    // Read migration directories in order
    const migrationDirs = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    for (const dirName of migrationDirs) {
      if (appliedNames.has(dirName)) continue;

      // CR-09: Validate migration directory name to prevent SQL injection
      if (!MIGRATION_DIR_RE.test(dirName)) {
        log('warn', 'Skipping migration with suspicious directory name:', dirName);
        continue;
      }

      const sqlPath = path.join(migrationsDir, dirName, 'migration.sql');
      if (!fs.existsSync(sqlPath)) continue;

      log('info', 'Applying migration:', dirName);
      const sql = fs.readFileSync(sqlPath, 'utf-8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');

      // CR-33: The semicolon-based SQL splitter is naive and breaks on semicolons
      // inside string literals (e.g., INSERT VALUES containing ';'). Prisma's
      // machine-generated migration SQL normally avoids this, but we check and
      // skip any migration that contains semicolons within quoted strings to be safe.
      if (hasSemicolonInQuotedString(sql)) {
        log('warn', `Migration "${dirName}" contains semicolons inside quoted strings — skipping (manual intervention required)`);
        continue;
      }

      // Split on semicolons — safe only for SQL without semicolons in string literals
      // (see hasSemicolonInQuotedString check above).
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        await prisma.$executeRawUnsafe(stmt);
      }

      // CR-09: Use parameterized query to prevent SQL injection via dirName/checksum
      const migrationId = crypto.randomUUID();
      await prisma.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
         VALUES (?, ?, datetime('now'), ?, ?)`,
        migrationId,
        checksum,
        dirName,
        statements.length,
      );

      log('info', 'Migration applied:', dirName);
    }

    log('info', 'All migrations up to date');
  } finally {
    // CR-05: No catch — errors propagate to startBackend which shows a dialog
    await prisma.$disconnect();
  }
}

async function startBackend() {
  const backendRoot = getBackendRoot();
  const entryPoint = path.join(backendRoot, 'dist', 'src', 'main.js');
  const dataDir = getDataDir();

  fs.mkdirSync(dataDir, { recursive: true });

  // CR-07: Kill any orphan backend process from a previous crash
  killStalePid();

  const dbPath = path.join(dataDir, 'finance.db').replace(/\\/g, '/');
  const dbUrl = `file:${dbPath}`;
  const env = {
    ...process.env,
    NODE_ENV: 'production',
    DATABASE_URL: dbUrl,
  };

  log('info', 'Backend root:', backendRoot);
  log('info', 'Entry point:', entryPoint);
  log('info', 'Database path:', dbPath);
  log('info', 'Entry point exists:', fs.existsSync(entryPoint));

  // CR-05: Let migration errors propagate — caller shows error dialog
  await runMigrations(dbUrl);

  return new Promise((resolve, reject) => {
    // CR-22: Prevent double-settle (both resolve and reject firing)
    let settled = false;

    backendProc = fork(entryPoint, [], {
      env,
      stdio: 'pipe',
      windowsHide: true,
    });

    // CR-07: Write PID file so we can kill orphans on next launch
    if (backendProc.pid !== undefined) {
      writePidFile(backendProc.pid);
    }

    if (backendProc.stdout) {
      backendProc.stdout.on('data', (data) => {
        log('info', '[backend]', data.toString().trimEnd());
      });
    }
    if (backendProc.stderr) {
      backendProc.stderr.on('data', (data) => {
        log('error', '[backend]', data.toString().trimEnd());
      });
    }

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      log('warn', 'Backend did not signal ready within timeout, proceeding anyway');
      resolve();
    }, BACKEND_READY_TIMEOUT_MS);

    backendProc.on('message', (msg) => {
      if (msg === 'ready') {
        if (settled) return;
        settled = true;
        log('info', 'Backend signalled ready');
        clearTimeout(timeout);
        resolve();
      }
    });

    backendProc.on('error', (err) => {
      log('error', 'Backend process error:', err.message);
      clearTimeout(timeout);
      if (settled) return;
      settled = true;
      reject(err);
    });

    backendProc.on('exit', (code, signal) => {
      log('info', `Backend exited code=${code} signal=${signal}`);
      clearTimeout(timeout);
      backendProc = null;
      cleanupPidFile();
      if (!settled && code !== 0 && code !== null) {
        settled = true;
        reject(new Error(`Backend exited with code ${code}`));
      }
    });
  });
}

function stopBackend() {
  return new Promise((resolve) => {
    if (!backendProc || backendProc.killed) {
      cleanupPidFile();
      resolve();
      return;
    }

    const forceKillTimeout = setTimeout(() => {
      if (backendProc && !backendProc.killed) {
        log('warn', 'Backend did not exit gracefully, sending SIGKILL');
        backendProc.kill('SIGKILL');
      }
      resolve();
    }, 5000);

    // CR-21: Use .once() instead of .on() to avoid leaking listeners
    backendProc.once('exit', () => {
      clearTimeout(forceKillTimeout);
      cleanupPidFile();
      resolve();
    });

    // CR-08: SIGTERM is a no-op on Windows. Send an IPC shutdown message instead.
    // NOTE: The backend (main.ts) needs a corresponding listener:
    //   process.on('message', (msg) => { if (msg === 'shutdown') app.close(); });
    // The SIGKILL timeout above serves as the fallback if IPC shutdown is not handled.
    try {
      backendProc.send('shutdown');
    } catch {
      // IPC channel may already be closed — fall through to SIGKILL timeout
      log('warn', 'Failed to send IPC shutdown, will force-kill after timeout');
    }
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  // Fix for Chromium/Electron focus bug on Windows where inputs become unresponsive
  win.on('focus', () => {
    win.webContents.focus();
  });

  // CR-26: Block window.open calls (prevent external popups)
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // CR-26: Block navigation to non-local URLs
  win.webContents.on('will-navigate', (event, url) => {
    const allowedOrigins = [DEV_SERVER_URL, 'file://'];
    const isAllowed = allowedOrigins.some((origin) => url.startsWith(origin));
    if (!isAllowed) {
      log('warn', 'Blocked navigation to non-local URL:', url);
      event.preventDefault();
    }
  });

  if (isDev) {
    win.loadURL(DEV_SERVER_URL);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(__dirname, '..', 'build', 'index.html');
    win.loadFile(indexPath);
    if (forceDevTools) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  }

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    log('error', 'Renderer failed to load', { errorCode, errorDescription, validatedURL });
  });
}

app.whenReady().then(() => {
  initLogFile();

  // Show window immediately — renderer shows splash screen while backend boots
  createWindow();

  if (!isDev) {
    startBackend().catch((err) => {
      // CR-05: Show error dialog to the user on migration/startup failure
      log('error', 'Failed to start backend:', err.message);
      dialog.showErrorBox(
        'Backend Startup Failed',
        `The application backend could not start.\n\n${err.message}\n\nThe app may not function correctly.`,
      );
    });
  } else {
    log('info', 'Dev mode — expecting backend to be running separately');
  }
});

// CR-06: Rewrite as non-async to guarantee app.quit() is always called.
// CR-34: Close logStream in .finally().
app.on('before-quit', (e) => {
  if (!isDev && !isQuitting) {
    isQuitting = true;
    e.preventDefault();
    stopBackend()
      .catch((err) => {
        log('error', 'Error stopping backend:', err.message);
      })
      .finally(() => {
        cleanupPidFile();
        if (logStream) {
          logStream.end();
          logStream = null;
        }
        app.quit();
      });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
