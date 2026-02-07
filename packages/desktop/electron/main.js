const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { fork, execFileSync } = require('node:child_process');
const fs = require('node:fs');

const isDev = !app.isPackaged;
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const forceDevTools = process.argv.includes('--dev');

const BACKEND_READY_TIMEOUT_MS = 15_000;

let backendProc = null;
let isQuitting = false;

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

function runMigrations(env) {
  const backendRoot = getBackendRoot();
  const prismaBin = path.join(backendRoot, 'node_modules', '.bin', 'prisma');

  if (!fs.existsSync(prismaBin)) {
    console.warn('Prisma CLI not found, skipping migrations');
    return;
  }

  try {
    console.log('Running database migrations...');
    execFileSync(prismaBin, ['migrate', 'deploy'], {
      cwd: backendRoot,
      env,
      stdio: 'ignore',
      timeout: 30_000,
    });
    console.log('Database migrations complete');
  } catch (err) {
    console.warn('Migration failed, database may already be up to date:', err.message);
  }
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const entryPoint = path.join(getBackendRoot(), 'dist', 'src', 'main.js');
    const dataDir = getDataDir();

    fs.mkdirSync(dataDir, { recursive: true });

    const dbPath = path.join(dataDir, 'finance.db').replace(/\\/g, '/');
    const env = {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`,
    };

    runMigrations(env);

    console.log('Starting NestJS backend from', entryPoint);
    console.log('Database path:', dbPath);

    backendProc = fork(entryPoint, [], {
      env,
      stdio: 'pipe',
      windowsHide: true,
    });

    // Pipe backend stdout/stderr to the main process console
    if (backendProc.stdout) {
      backendProc.stdout.on('data', (data) => {
        console.log(`[backend] ${data.toString().trimEnd()}`);
      });
    }
    if (backendProc.stderr) {
      backendProc.stderr.on('data', (data) => {
        console.error(`[backend] ${data.toString().trimEnd()}`);
      });
    }

    const timeout = setTimeout(() => {
      console.warn('Backend did not signal ready within timeout, proceeding anyway');
      resolve();
    }, BACKEND_READY_TIMEOUT_MS);

    backendProc.on('message', (msg) => {
      if (msg === 'ready') {
        console.log('Backend signalled ready');
        clearTimeout(timeout);
        resolve();
      }
    });

    backendProc.on('error', (err) => {
      console.error('Backend process error:', err);
      clearTimeout(timeout);
      reject(err);
    });

    backendProc.on('exit', (code, signal) => {
      console.log(`Backend process exited with code=${code}, signal=${signal}`);
      clearTimeout(timeout);
      backendProc = null;
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
        console.warn('Backend did not exit gracefully, sending SIGKILL');
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
    const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
    win.loadFile(indexPath);
    if (forceDevTools) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  }

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error('Renderer failed to load', { errorCode, errorDescription, validatedURL });
  });
}

app.whenReady().then(async () => {
  if (!isDev) {
    try {
      await startBackend();
    } catch (err) {
      console.error('Failed to start backend:', err);
    }
  } else {
    console.log('Dev mode detected; expecting backend to be running separately.');
  }

  createWindow();
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
