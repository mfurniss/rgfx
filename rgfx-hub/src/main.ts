/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import log from 'electron-log/main';
import { createIPCHandler } from 'electron-trpc/main';
import { MqttBroker, NetworkManager } from './network';
import { EventFileReader } from './event-file-reader';
import { DriverRegistry } from './driver-registry';
import { SystemMonitor } from './system-monitor';
import { DriverConfig } from './driver-config';
import { DriverLogPersistence } from './driver-log-persistence';
import { LEDHardwareManager } from './led-hardware-manager';
import { TransformerEngine } from './transformer-engine';
import { UdpClientImpl } from './transformer/udp-client';
import { MqttClientWrapper } from './transformer/mqtt-client-wrapper';
import { StateStoreImpl } from './transformer/state-store';
import { LoggerWrapper } from './transformer/logger-wrapper';
import { installDefaultTransformers } from './transformer-installer';
import { installDefaultInterceptors } from './interceptor-installer';
import { installDefaultLedHardware } from './led-hardware-installer';
import {
  MQTT_DEFAULT_PORT,
  MAIN_WINDOW_WIDTH,
  MAIN_WINDOW_HEIGHT,
  MAIN_WINDOW_ZOOM_FACTOR,
  OPEN_DEVTOOLS_IN_DEV,
  SYSTEM_STATUS_UPDATE_INTERVAL_MS,
  MAX_SYSTEM_ERRORS,
} from './config/constants';
import { registerIpcHandlers } from './ipc';
import { registerMqttSubscriptions } from './mqtt-subscriptions';
import { createUploadConfigToDriver } from './upload-config-to-driver';
import { configureSerialPort } from './serial-port-config';
import { setupDriverEventHandlers } from './driver-callbacks';
import { clearEffectsOnAllDrivers } from './shutdown';
import { serializeDriverForIPC, type SystemError } from './types';
import { appRouter } from './trpc/router';
import { ConfigError } from './errors/config-error';
import { z } from 'zod';
import pkg from '../package.json';

// Configure Zod for user-friendly error messages
// In Zod v4, "Required" became "Invalid input: expected X, received undefined"
// This restores clearer messages for missing required fields
z.config({
  customError: (issue) => {
    if (issue.code === 'invalid_type' && issue.input === undefined) {
      return 'Required field is missing';
    }
    return undefined; // Use default message for other errors
  },
});

// Vite environment variables injected by Electron Forge
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Initialize electron-log
log.initialize();

// Configure log level - can be set via LOG_LEVEL env var
// Levels: error, warn, info, debug (default: info)
const logLevel = (process.env.LOG_LEVEL ?? 'info') as 'error' | 'warn' | 'info' | 'debug';
log.transports.console.level = logLevel;
log.transports.file.level = logLevel;

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

log.info(`RGFX Hub ${pkg.version} starting...`);

// Window reference
let mainWindow: BrowserWindow | null = null;

// System status update interval reference
let statusUpdateInterval: NodeJS.Timeout | null = null;

// Initialize services (persistence first, then registry)
const configPath = path.join(app.getPath('home'), '.rgfx');
const driverConfig = new DriverConfig(configPath);
const driverLogPersistence = new DriverLogPersistence(configPath);
const ledHardwareManager = new LEDHardwareManager(configPath);

// System error tracking
const systemErrors: SystemError[] = [];

// Load driver configuration BEFORE creating registry
// Registry constructor reads from persistence to pre-populate known drivers
try {
  driverConfig.loadConfig();
} catch (error) {
  if (error instanceof ConfigError) {
    log.error(`Critical config error: ${error.message}`);
    log.error(`Details: ${error.details}`);
    systemErrors.push(error.toSystemError());
  } else {
    throw error;
  }
}

const mqtt = new MqttBroker(MQTT_DEFAULT_PORT);
const eventReader = new EventFileReader();
const driverRegistry = new DriverRegistry(driverConfig, ledHardwareManager);
const systemMonitor = new SystemMonitor();

// Create uploadConfigToDriver function
const uploadConfigToDriver = createUploadConfigToDriver({
  driverConfig,
  ledHardwareManager,
  mqtt,
});

// Initialize mapping engine with context services
const udpClient = new UdpClientImpl(driverRegistry, systemMonitor);
const mqttClient = new MqttClientWrapper(mqtt);
const stateStore = new StateStoreImpl();
const logger = new LoggerWrapper(log);

const transformerEngine = new TransformerEngine({
  broadcast: udpClient.broadcast.bind(udpClient),
  udp: udpClient,
  mqtt: mqttClient,
  http: {
    get: (url: string, options?: RequestInit) => fetch(url, { ...options, method: 'GET' }),
    post: (url: string, body: unknown, options?: RequestInit) => {
      const headers = new Headers({ 'Content-Type': 'application/json' });

      if (options?.headers) {
        const extraHeaders =
          options.headers instanceof Headers ? options.headers : new Headers(options.headers);

        extraHeaders.forEach((value, key) => {
          headers.set(key, value);
        });
      }

      return fetch(url, { ...options, method: 'POST', body: JSON.stringify(body), headers });
    },
    put: (url: string, body: unknown, options?: RequestInit) => {
      const headers = new Headers({ 'Content-Type': 'application/json' });

      if (options?.headers) {
        const extraHeaders =
          options.headers instanceof Headers ? options.headers : new Headers(options.headers);

        extraHeaders.forEach((value, key) => {
          headers.set(key, value);
        });
      }

      return fetch(url, { ...options, method: 'PUT', body: JSON.stringify(body), headers });
    },
    delete: (url: string, options?: RequestInit) => fetch(url, { ...options, method: 'DELETE' }),
  },
  state: stateStore,
  log: logger,
  drivers: driverRegistry,
});

// Event statistics tracking
let eventsProcessed = 0;

// Helper to check for critical errors that should block normal operation
function hasCriticalError(): boolean {
  return systemErrors.some((e) => e.errorType === 'config');
}

// Helper to safely check if window is available and not destroyed
function isWindowAvailable(): boolean {
  return mainWindow !== null && !mainWindow.isDestroyed();
}

// Helper to send system status to renderer
function sendSystemStatus() {
  if (!isWindowAvailable() || !mainWindow) {
    return;
  }
  const status = systemMonitor.getSystemStatus(
    driverRegistry.getConnectedCount(),
    driverRegistry.getAllDrivers().length,
    eventsProcessed,
    systemErrors,
  );
  mainWindow.webContents.send('system:status', status);
}

// Register driver event handlers
setupDriverEventHandlers({
  driverRegistry,
  driverConfig,
  systemMonitor,
  mqtt,
  getMainWindow: () => mainWindow,
  getEventsProcessed: () => eventsProcessed,
  getSystemErrors: () => systemErrors,
  uploadConfigToDriver,
});

// Create network manager to handle network changes
const networkManager = new NetworkManager(mqtt, () => {
  sendSystemStatus();
});

// Handle event processing (used by both event file reader and simulator)
function processEvent(topic: string, payload: string): void {
  eventsProcessed++;

  // Forward event to renderer for counting and persistence
  if (isWindowAvailable() && mainWindow) {
    mainWindow.webContents.send('event:received', topic, payload || undefined);
  }
}

// Only start services if no critical errors (corrupt config files)
if (!hasCriticalError()) {
  // Start MQTT broker
  mqtt.start();

  // Start connection timeout monitor (checks for drivers that stop responding)
  driverRegistry.startConnectionMonitor();

  // Install default transformers and interceptors to user config directory (async)
  void installDefaultTransformers()
    .then(() => {
      // Load transformer engine handlers after installing defaults
      void transformerEngine.loadTransformers();
    })
    .catch((error: unknown) => {
      log.error('Failed to install default transformers:', error);
    });

  void installDefaultInterceptors().catch((error: unknown) => {
    log.error('Failed to install default interceptors:', error);
  });

  void installDefaultLedHardware().catch((error: unknown) => {
    log.error('Failed to install LED hardware definitions:', error);
  });

  // Register IPC handlers
  registerIpcHandlers({
    driverRegistry,
    driverConfig,
    driverLogPersistence,
    ledHardwareManager,
    mqtt,
    uploadConfigToDriver,
    udpClient,
    transformerEngine,
    onEventProcessed: processEvent,
    resetEventsProcessed: () => {
      eventsProcessed = 0;
    },
    getMainWindow: () => {
      if (!mainWindow) {
        throw new Error('Main window not initialized');
      }
      return mainWindow;
    },
  });

  // Register MQTT subscriptions
  registerMqttSubscriptions({
    mqtt,
    driverRegistry,
    driverConfig,
    systemMonitor,
    driverLogPersistence,
    getMainWindow: () => mainWindow,
    getEventsProcessed: () => eventsProcessed,
    addSystemError: (error) => {
      systemErrors.push(error);

      if (systemErrors.length > MAX_SYSTEM_ERRORS) {
        systemErrors.shift();
      }
      sendSystemStatus();
    },
  });

  // Start reading events and send to transformer engine for processing
  eventReader.start((topic, message) => {
    // Check for interceptor error events
    if (topic === 'rgfx/interceptor/error') {
      log.error(`Interceptor error: ${message}`);
      systemErrors.push({ errorType: 'interceptor', message, timestamp: Date.now() });

      if (systemErrors.length > MAX_SYSTEM_ERRORS) {
        systemErrors.shift();
      }

      sendSystemStatus();
    }

    void transformerEngine.handleEvent(topic, message);
    processEvent(topic, message);
  });

  // Start firmware monitoring
  systemMonitor.startFirmwareMonitoring((_version: string | null) => {
    log.info('[main] Firmware version updated, broadcasting new system status');
    sendSystemStatus();
  });
} else {
  log.error('Critical config error detected - services not started');
}

// Register critical error IPC handlers (always available, even in error state)
ipcMain.handle('file:show-in-folder', (_event, filePath: string) => {
  shell.showItemInFolder(filePath);
});

ipcMain.on('app:quit', () => {
  app.quit();
});

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    title: '',
    backgroundColor: '#121212',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  // Load the index.html of the app
  // In development, MAIN_WINDOW_VITE_DEV_SERVER_URL will be set by Electron Forge
  // In production, we load the built HTML file
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

  // Open the DevTools in development mode (if enabled via OPEN_DEVTOOLS_IN_DEV constant)
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (OPEN_DEVTOOLS_IN_DEV && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  // Quit app when window is closed
  mainWindow.on('close', () => {
    log.info('Main window closing, quitting app...');
    app.quit();
  });

  // Setup tRPC IPC handler for type-safe cross-process communication
  createIPCHandler({ router: appRouter, windows: [mainWindow] });

  // Wait for renderer to signal it's ready before sending initial state
  // Use 'on' instead of 'once' to handle HMR reloads during development
  ipcMain.on('renderer:ready', () => {
    if (!isWindowAvailable() || !mainWindow) {
      return;
    }

    // Always send system status (includes critical errors if any)
    sendSystemStatus();

    // If critical error, don't send driver state or start updates
    if (hasCriticalError()) {
      return;
    }

    // Send initial driver state (both connected and disconnected)
    // Use driver:updated, not driver:connected, since these are persisted drivers
    // that haven't actually connected yet in this session
    driverRegistry.getAllDrivers().forEach((driver) => {
      if (isWindowAvailable() && mainWindow) {
        mainWindow.webContents.send('driver:updated', serializeDriverForIPC(driver));
      }
    });

    // Start periodic system status updates (for event counts during gameplay)
    if (statusUpdateInterval) {
      clearInterval(statusUpdateInterval);
    }
    statusUpdateInterval = setInterval(sendSystemStatus, SYSTEM_STATUS_UPDATE_INTERVAL_MS);
  });

  return mainWindow;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Set About panel options for macOS
  app.setAboutPanelOptions({
    applicationName: 'RGFX Hub',
    applicationVersion: pkg.version,
    copyright: 'Copyright © 2025 Matt Furniss',
    version: `Built with Electron ${process.versions.electron}`,
  });

  // Load Redux DevTools extension in development mode
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const extensionPath = path.join(
      app.getPath('userData'),
      'extensions',
      'lmhkpmbekcpmknklioeibfkpmmfibljd',
    );

    session.defaultSession.extensions
      .loadExtension(extensionPath, {
        allowFileAccess: true,
      })
      .then(() => {
        log.info('Loaded Redux DevTools extension');
      })
      .catch((err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        log.warn(`Redux DevTools not available: ${errorMessage}`);
      });
  }

  // Configure Web Serial API support
  configureSerialPort();

  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup on app quit
app.on('before-quit', () => {
  log.info('Shutting down...');

  // Stop periodic status updates
  if (statusUpdateInterval) {
    clearInterval(statusUpdateInterval);
    statusUpdateInterval = null;
  }

  // Stop connection monitor
  driverRegistry.stopConnectionMonitor();

  // Clear effects on all connected drivers before shutdown, then stop services
  clearEffectsOnAllDrivers(driverRegistry, mqtt)
    .catch((err: unknown) => {
      log.error('Failed to clear effects on shutdown:', err);
    })
    .finally(() => {
      eventReader.stop();
      udpClient.stop();
      networkManager.stop();
      void mqtt.stop();
    });
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
