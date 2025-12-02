const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const os = require('node:os');

const isDev = !app.isPackaged;
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const BACKEND_JAR = 'finance-backend-0.0.1-SNAPSHOT.jar';

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
  const javaCmd = os.platform() === 'win32' ? 'java.exe' : 'java';

  console.log('Starting backend from', jarPath);

  backendProc = spawn(javaCmd, ['-jar', jarPath], {
    stdio: 'ignore',
    windowsHide: true,
  });

  backendProc.on('error', (err) => {
    console.error('Backend process error:', err);
  });

  backendProc.on('exit', (code, signal) => {
    console.log(`Backend process exited with code=${code}, signal=${signal}`);
    backendProc = null;
  });
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
  }
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
  stopBackend();
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
