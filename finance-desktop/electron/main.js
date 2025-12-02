const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const fs = require('node:fs');

const isDev = !app.isPackaged;
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const BACKEND_JAR = 'finance-backend-0.0.1-SNAPSHOT.jar';
const forceDevTools = process.argv.includes('--dev');
const debugBackend = forceDevTools;

function getJavaCmd() {
  if (isDev) {
    return 'java';
  }

  const jreBase = path.join(process.resourcesPath, 'jre');
  const bundled = path.join(jreBase, 'bin', 'java.exe');
  if (fs.existsSync(bundled)) {
    return bundled;
  }

  console.warn('Bundled JRE not found, falling back to system java');
  return 'java';
}

function getPortableDataDir() {
  const exeDir = process.env.PORTABLE_EXECUTABLE_DIR;
  if (!exeDir) {
    return null;
  }
  return path.join(exeDir, 'data');
}

function getBackendJarPath() {
  if (isDev) {
    // In dev, use the jar produced by the backend module.
    return path.resolve(__dirname, '..', '..', 'finance-backend', 'target', BACKEND_JAR);
  }

  // In production, the jar is copied into the packaged app's resources.
  return path.join(process.resourcesPath, 'backend', BACKEND_JAR);
}

let backendProc = null;

function startBackend() {
  const jarPath = getBackendJarPath();
  const env = { ...process.env };

  if (!isDev) {
    const dataDir = getPortableDataDir();
    if (dataDir) {
      // Ensure data directory exists for H2 file DB.
      fs.mkdirSync(dataDir, { recursive: true });
      const dbFilePath = path.join(dataDir, 'finance-db').replace(/\\/g, '/');
      env.SPRING_DATASOURCE_URL = `jdbc:h2:file:${dbFilePath};AUTO_SERVER=TRUE`;
    }
  }

  function spawnBackend(javaCmd, allowFallback) {
    console.log('Starting backend from', jarPath, 'using', javaCmd);

    backendProc = spawn(javaCmd, ['-jar', jarPath], {
      env,
      stdio: debugBackend ? 'inherit' : 'ignore',
      windowsHide: true,
    });

    backendProc.on('error', (err) => {
      console.error('Backend process error:', err);
    });

    backendProc.on('exit', (code, signal) => {
      console.log(`Backend process exited with code=${code}, signal=${signal}`);
      backendProc = null;
      if (!isDev && allowFallback && javaCmd !== 'java' && code !== 0) {
        console.warn('Retrying backend with system java fallback');
        spawnBackend('java', false);
      }
    });
  }

  spawnBackend(getJavaCmd(), true);
}

function stopBackend() {
  if (backendProc && !backendProc.killed) {
    backendProc.kill();
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
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

app.whenReady().then(() => {
  // In dev, assume backend is started manually to avoid accidental rebuilds.
  if (!isDev) {
    startBackend();
  } else {
    console.log('Dev mode detected; expecting backend to be running separately.');
  }

  createWindow();
});

app.on('before-quit', () => {
  if (!isDev) {
    stopBackend();
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
