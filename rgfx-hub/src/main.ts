/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import log from 'electron-log/main';
import { MqttBroker } from './network';
import { EventFileReader } from './event-file-reader';
import { DriverRegistry } from './driver-registry';
import { SystemMonitor } from './system-monitor';
import { DriverPersistence } from './driver-persistence';
import { DriverLogPersistence } from './driver-log-persistence';
import { LEDHardwareManager } from './led-hardware-manager';
import { MappingEngine } from './mapping-engine';
import { UdpClientImpl } from './mapping/udp-client';
import { MqttClientWrapper } from './mapping/mqtt-client-wrapper';
import { StateStoreImpl } from './mapping/state-store';
import { LoggerWrapper } from './mapping/logger-wrapper';
import { installDefaultMappers } from './mapper-installer';
import {
  MQTT_DEFAULT_PORT,
  MAIN_WINDOW_WIDTH,
  MAIN_WINDOW_HEIGHT,
  MAIN_WINDOW_ZOOM_FACTOR,
  OPEN_DEVTOOLS_IN_DEV,
} from './config/constants';
import { registerIpcHandlers } from './ipc';
import { registerMqttSubscriptions } from './mqtt-subscriptions';
import { createUploadConfigToDriver } from './upload-config-to-driver';
import { configureSerialPort } from './serial-port-config';
import { registerDriverCallbacks } from './driver-callbacks';
import { serializeDriverForIPC } from './types';
import pkg from '../package.json';

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

// Initialize services (persistence first, then registry)
const configPath = path.join(app.getPath('home'), '.rgfx');
const driverPersistence = new DriverPersistence(configPath);
const driverLogPersistence = new DriverLogPersistence(configPath);
const ledHardwareManager = new LEDHardwareManager(configPath);
const mqtt = new MqttBroker(MQTT_DEFAULT_PORT);
const eventReader = new EventFileReader();
const driverRegistry = new DriverRegistry(driverPersistence, ledHardwareManager);
const systemMonitor = new SystemMonitor();

// Create uploadConfigToDriver function
const uploadConfigToDriver = createUploadConfigToDriver({
  driverPersistence,
  ledHardwareManager,
  mqtt,
});

// Initialize mapping engine with context services
const udpClient = new UdpClientImpl(driverRegistry);
const mqttClient = new MqttClientWrapper(mqtt);
const stateStore = new StateStoreImpl();
const logger = new LoggerWrapper(log);

const mappingEngine = new MappingEngine({
  broadcast: udpClient.broadcast.bind(udpClient),
  udp: udpClient,
  mqtt: mqttClient,
  http: {
    get: () => Promise.resolve(new Response()),
    post: () => Promise.resolve(new Response()),
    put: () => Promise.resolve(new Response()),
    delete: () => Promise.resolve(new Response()),
  },
  state: stateStore,
  log: logger,
  drivers: driverRegistry,
});

// Event statistics tracking
let eventsProcessed = 0;

// Helper to safely check if window is available and not destroyed
function isWindowAvailable(): boolean {
  return mainWindow !== null && !mainWindow.isDestroyed();
}

// Helper to send system status to renderer
function sendSystemStatus() {
  if (!isWindowAvailable() || !mainWindow) {
    return;
  }
  const status = systemMonitor.getSystemStatus(driverRegistry.getConnectedCount(), eventsProcessed);
  mainWindow.webContents.send('system:status', status);
}

// Register driver callbacks
registerDriverCallbacks({
  driverRegistry,
  driverPersistence,
  systemMonitor,
  mqtt,
  getMainWindow: () => mainWindow,
  getEventsProcessed: () => eventsProcessed,
  uploadConfigToDriver,
});

// Start MQTT broker
mqtt.start();

// Install default mappers to user data directory (async)
void installDefaultMappers()
  .then(() => {
    // Load mapping engine handlers after installing defaults
    void mappingEngine.loadMappings();
  })
  .catch((error: unknown) => {
    log.error('Failed to install default mappers:', error);
  });

// Track event topics and their counts
const eventTopicCounts = new Map<string, number>();
const eventTopicLastValues = new Map<string, string>();

// Handle event processing (used by both event file reader and simulator)
function processEvent(topic: string, payload: string): void {
  eventsProcessed++;

  // Track event topic count and last value
  const currentCount = eventTopicCounts.get(topic) ?? 0;
  eventTopicCounts.set(topic, currentCount + 1);
  eventTopicLastValues.set(topic, payload);

  // Send event count to renderer in real-time (lightweight, just a number)
  if (isWindowAvailable() && mainWindow) {
    mainWindow.webContents.send('event:count', eventsProcessed);
    mainWindow.webContents.send('event:topic', {
      topic,
      count: currentCount + 1,
      lastValue: payload.length > 0 ? payload : undefined,
    });
  }
}

// Register IPC handlers
registerIpcHandlers({
  driverRegistry,
  driverPersistence,
  driverLogPersistence,
  ledHardwareManager,
  mqtt,
  uploadConfigToDriver,
  udpClient,
  mappingEngine,
  onEventProcessed: processEvent,
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
  systemMonitor,
  driverLogPersistence,
  getMainWindow: () => mainWindow,
  getEventsProcessed: () => eventsProcessed,
});

// Start reading events and send to mapping engine for processing
eventReader.start((topic, message) => {
  void mappingEngine.handleEvent(topic, message);
  processEvent(topic, message);
});

// Start firmware monitoring
systemMonitor.startFirmwareMonitoring((_version: string | null) => {
  log.info('[main] Firmware version updated, broadcasting new system status');
  sendSystemStatus();
});

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    title: `RGFX Hub v${pkg.version}`,
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

  // Wait for renderer to signal it's ready before sending initial state
  // Use 'on' instead of 'once' to handle HMR reloads during development
  ipcMain.on('renderer:ready', () => {
    if (!isWindowAvailable() || !mainWindow) {
      return;
    }

    // Send all drivers (both connected and disconnected)
    driverRegistry.getAllDrivers().forEach((driver) => {
      if (isWindowAvailable() && mainWindow) {
        mainWindow.webContents.send('driver:connected', serializeDriverForIPC(driver));
      }
    });
    // Send system status
    sendSystemStatus();
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

  // Stop services
  eventReader.stop();
  udpClient.stop();
  void mqtt.stop();
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
