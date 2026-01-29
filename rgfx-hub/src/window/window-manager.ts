/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import windowStateKeeper from 'electron-window-state';
import { createIPCHandler } from 'electron-trpc/main';
import type { SystemMonitor } from '../system-monitor';
import type { DriverRegistry } from '../driver-registry';
import type { EventFileReader } from '../event-file-reader';
import type { SystemErrorTracker } from '../services/system-error-tracker';
import type { EventStats } from '../services/event-stats';
import type { Logger } from '../services/service-factory';
import { serializeDriverForIPC } from '../types';
import { appRouter } from '../trpc/router';
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
  eventReader: EventFileReader;
  systemErrorTracker: SystemErrorTracker;
  eventStats: EventStats;
  log: Logger;
}

export interface WindowManager {
  getWindow(): BrowserWindow | null;
  isAvailable(): boolean;
  createWindow(): BrowserWindow;
  sendSystemStatus(): void;
  sendEventToRenderer(channel: string, ...args: unknown[]): void;
  startStatusUpdates(): void;
  stopStatusUpdates(): void;
}

/**
 * Creates a window manager that handles BrowserWindow creation,
 * state persistence, and renderer communication.
 */
export function createWindowManager(deps: WindowManagerDeps): WindowManager {
  const { systemMonitor, driverRegistry, eventReader, systemErrorTracker, eventStats, log } = deps;

  let mainWindow: BrowserWindow | null = null;
  let statusUpdateInterval: NodeJS.Timeout | null = null;

  function isAvailable(): boolean {
    return mainWindow !== null && !mainWindow.isDestroyed();
  }

  function safeSend(channel: string, ...args: unknown[]): void {
    if (!isAvailable() || !mainWindow) {
      return;
    }

    // webContents can be destroyed even if window isn't (e.g., during renderer crash)
    if (mainWindow.webContents.isDestroyed()) {
      return;
    }

    try {
      mainWindow.webContents.send(channel, ...args);
    } catch (error) {
      // Ignore "Render frame was disposed" errors during shutdown
      if (error instanceof Error && error.message.includes('Render frame was disposed')) {
        return;
      }
      throw error;
    }
  }

  function sendSystemStatus(): void {
    if (!isAvailable()) {
      return;
    }

    const status = systemMonitor.getSystemStatus(
      driverRegistry.getConnectedCount(),
      driverRegistry.getAllDrivers().length,
      eventStats.getCount(),
      eventReader.getFileSizeBytes(),
      systemErrorTracker.errors,
    );
    safeSend('system:status', status);
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

    // Setup tRPC IPC handler for type-safe cross-process communication
    createIPCHandler({ router: appRouter, windows: [mainWindow] });

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
        safeSend('driver:updated', serializeDriverForIPC(driver));
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
    getWindow: () => mainWindow,
    isAvailable,
    createWindow,
    sendSystemStatus,

    sendEventToRenderer(channel: string, ...args: unknown[]): void {
      safeSend(channel, ...args);
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
