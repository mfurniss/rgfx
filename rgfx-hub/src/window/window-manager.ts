import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import windowStateKeeper from 'electron-window-state';
import type { SystemMonitor } from '../system-monitor';
import type { DriverRegistry } from '../driver-registry';
import type { SystemErrorTracker } from '../services/system-error-tracker';
import type { Logger } from '../services/service-factory';
import { sendToRenderer } from '../utils/driver-utils';
import type { IpcChannel } from '../config/ipc-channels';
import { IPC } from '../config/ipc-channels';
import {
  MAIN_WINDOW_WIDTH,
  MAIN_WINDOW_HEIGHT,
  MAIN_WINDOW_ZOOM_FACTOR,
  OPEN_DEVTOOLS_IN_DEV,
  SYSTEM_STATUS_UPDATE_INTERVAL_MS,
} from '../config/constants';
import { CONFIG_DIRECTORY } from '../config/paths';

export interface WindowManagerDeps {
  systemMonitor: SystemMonitor;
  driverRegistry: DriverRegistry;
  systemErrorTracker: SystemErrorTracker;
  log: Logger;
}

export interface WindowManager {
  getWindow(): BrowserWindow | null;
  isAvailable(): boolean;
  createWindow(): BrowserWindow;
  focusWindow(): void;
  sendSystemStatus(): void;
  sendEventToRenderer(channel: IpcChannel, ...args: unknown[]): void;
  startStatusUpdates(): void;
  stopStatusUpdates(): void;
}

/**
 * Creates a window manager that handles BrowserWindow creation,
 * state persistence, and renderer communication.
 */
export function createWindowManager(deps: WindowManagerDeps): WindowManager {
  const { systemMonitor, driverRegistry, systemErrorTracker, log } = deps;

  let mainWindow: BrowserWindow | null = null;
  let statusUpdateInterval: NodeJS.Timeout | null = null;

  const getWindow = () => mainWindow;

  function isAvailable(): boolean {
    return mainWindow !== null && !mainWindow.isDestroyed();
  }

  function sendSystemStatus(): void {
    if (!isAvailable()) {
      return;
    }

    sendToRenderer(getWindow, IPC.SYSTEM_STATUS, systemMonitor.getFullStatus());
  }

  function createWindow(): BrowserWindow {
    // Load saved window state (position, size, maximized)
    const mainWindowState = windowStateKeeper({
      defaultWidth: MAIN_WINDOW_WIDTH,
      defaultHeight: MAIN_WINDOW_HEIGHT,
      path: CONFIG_DIRECTORY,
      file: 'window-state.json',
    });

    mainWindow = new BrowserWindow({
      x: mainWindowState.x,
      y: mainWindowState.y,
      width: mainWindowState.width,
      height: mainWindowState.height,
      title: '',
      backgroundColor: '#121212',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false,
      },
    });

    // Register window state manager to track resize/move and save on close
    mainWindowState.manage(mainWindow);

    // Load the index.html of the app
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      log.info(`Loading dev server: ${MAIN_WINDOW_VITE_DEV_SERVER_URL}`);
      void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      log.info(`Loading production build from: ${MAIN_WINDOW_VITE_NAME}`);
      void mainWindow.loadFile(
        path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      );
    }

    // Set zoom level after page finishes loading
    mainWindow.webContents.on('did-finish-load', () => {
      if (mainWindow) {
        mainWindow.webContents.setZoomFactor(MAIN_WINDOW_ZOOM_FACTOR);
      }
    });

    // Open the DevTools in development mode
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (OPEN_DEVTOOLS_IN_DEV && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      mainWindow.webContents.openDevTools();
    }

    // Quit app when window is closed
    mainWindow.on('close', () => {
      log.info('Main window closing, stopping updates...');

      if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
        statusUpdateInterval = null;
      }

      app.quit();
    });

    // Handle renderer process crashes - reload to recover
    mainWindow.webContents.on('render-process-gone', (_event, details) => {
      log.error(`Renderer process gone: ${details.reason}`, details);

      // Stop trying to send to dead renderer
      if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
        statusUpdateInterval = null;
      }

      // Reload the window after a brief delay (allows crash logs to flush)
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          log.info('Reloading window after renderer crash...');
          mainWindow.reload();

          // Reopen DevTools in development mode after reload
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (OPEN_DEVTOOLS_IN_DEV && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
            mainWindow.webContents.once('did-finish-load', () => {
              mainWindow?.webContents.openDevTools();
            });
          }
        }
      }, 500);
    });

    // Handle load failures - retry loading
    mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      log.error(`Failed to load: ${errorDescription} (${errorCode}) at ${validatedURL}`);

      // Retry loading after a delay
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          log.info('Retrying load after failure...');
          mainWindow.reload();
        }
      }, 1000);
    });

    // Wait for renderer to signal it's ready before sending initial state
    // Use 'on' instead of 'once' to handle HMR reloads during development
    ipcMain.on('renderer:ready', () => {
      if (!isAvailable() || !mainWindow) {
        return;
      }

      // Always send system status (includes critical errors if any)
      sendSystemStatus();

      // If critical error, don't send driver state or start updates
      if (systemErrorTracker.hasCriticalError()) {
        return;
      }

      // Send initial driver state (both connected and disconnected)
      driverRegistry.getAllDrivers().forEach((driver) => {
        sendToRenderer(getWindow, IPC.DRIVER_UPDATED, driver);
      });

      // Start periodic system status updates
      if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
      }
      statusUpdateInterval = setInterval(() => {
        sendSystemStatus();
      }, SYSTEM_STATUS_UPDATE_INTERVAL_MS);
    });

    return mainWindow;
  }

  return {
    getWindow,
    isAvailable,
    createWindow,
    sendSystemStatus,

    focusWindow(): void {
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) {
          mainWindow.restore();
        }
        mainWindow.focus();
      }
    },

    sendEventToRenderer(channel: IpcChannel, ...args: unknown[]): void {
      sendToRenderer(getWindow, channel, ...args);
    },

    startStatusUpdates(): void {
      if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
      }
      statusUpdateInterval = setInterval(() => {
        sendSystemStatus();
      }, SYSTEM_STATUS_UPDATE_INTERVAL_MS);
    },

    stopStatusUpdates(): void {
      if (statusUpdateInterval) {
        clearInterval(statusUpdateInterval);
        statusUpdateInterval = null;
      }
    },
  };
}
