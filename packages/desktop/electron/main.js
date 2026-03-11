const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { fork } = require('node:child_process');
const fs = require('node:fs');
const crypto = require('node:crypto');

const isDev = !app.isPackaged;
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const forceDevTools = process.argv.includes('--dev');

const BACKEND_READY_TIMEOUT_MS = 15_000;

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
    log('error', 'Failed to load PrismaClient for migrations:', err.message);
    return;
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

      const sqlPath = path.join(migrationsDir, dirName, 'migration.sql');
      if (!fs.existsSync(sqlPath)) continue;

      log('info', 'Applying migration:', dirName);
      const sql = fs.readFileSync(sqlPath, 'utf-8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');

      // Split on semicolons (Prisma migration SQL is machine-generated, safe to split)
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        await prisma.$executeRawUnsafe(stmt);
      }

      await prisma.$executeRawUnsafe(
        `INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count")
         VALUES ('${crypto.randomUUID()}', '${checksum}', datetime('now'), '${dirName}', ${statements.length})`,
      );

      log('info', 'Migration applied:', dirName);
    }

    log('info', 'All migrations up to date');
  } catch (err) {
    log('error', 'Migration error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function startBackend() {
  const backendRoot = getBackendRoot();
  const entryPoint = path.join(backendRoot, 'dist', 'src', 'main.js');
  const dataDir = getDataDir();

  fs.mkdirSync(dataDir, { recursive: true });

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

  await runMigrations(dbUrl);

  return new Promise((resolve, reject) => {
    backendProc = fork(entryPoint, [], {
      env,
      stdio: 'pipe',
      windowsHide: true,
    });

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
      log('warn', 'Backend did not signal ready within timeout, proceeding anyway');
      resolve();
    }, BACKEND_READY_TIMEOUT_MS);

    backendProc.on('message', (msg) => {
      if (msg === 'ready') {
        log('info', 'Backend signalled ready');
        clearTimeout(timeout);
        resolve();
      }
    });

    backendProc.on('error', (err) => {
      log('error', 'Backend process error:', err.message);
      clearTimeout(timeout);
      reject(err);
    });

    backendProc.on('exit', (code, signal) => {
      log('info', `Backend exited code=${code} signal=${signal}`);
      clearTimeout(timeout);
      backendProc = null;
      if (code !== 0 && code !== null) {
        reject(new Error(`Backend exited with code ${code}`));
      }
    });
  });
}

function stopBackend() {
  return new Promise((resolve) => {
    if (!backendProc || backendProc.killed) {
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

    backendProc.on('exit', () => {
      clearTimeout(forceKillTimeout);
      resolve();
    });

    backendProc.kill('SIGTERM');
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
      log('error', 'Failed to start backend:', err.message);
    });
  } else {
    log('info', 'Dev mode — expecting backend to be running separately');
  }
});

app.on('before-quit', async (e) => {
  if (!isDev && !isQuitting) {
    isQuitting = true;
    e.preventDefault();
    await stopBackend();
    app.quit();
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
