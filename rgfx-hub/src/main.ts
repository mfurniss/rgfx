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
import { Mqtt } from './mqtt';
import { EventFileReader } from './event-file-reader';
import { DriverRegistry } from './driver-registry';
import { SystemMonitor } from './system-monitor';
import { DiscoveryService } from './discovery-service';
import { DriverPersistence } from './driver-persistence';
import { LEDHardwareManager } from './led-hardware-manager';
import { MappingEngine } from './mapping-engine';
import { UdpClientImpl } from './mapping/udp-client';
import { MqttClientWrapper } from './mapping/mqtt-client-wrapper';
import { StateStoreImpl } from './mapping/state-store';
import { LoggerWrapper } from './mapping/logger-wrapper';
import { installDefaultMappers } from './mapper-installer';
import type { DriverSystemInfo } from './types';
import {
  MQTT_DEFAULT_PORT,
  MAIN_WINDOW_WIDTH,
  MAIN_WINDOW_HEIGHT,
  MQTT_TOPIC_DISCOVERY,
  MQTT_BROKER_INIT_DELAY_MS,
} from './config/constants';
import { validateDriverId } from './driver-id-validator';
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

log.info(`RGFX Hub v${pkg.version} starting...`);

// Window reference
let mainWindow: BrowserWindow | null = null;

// Initialize services (persistence first, then registry)
const driverPersistence = new DriverPersistence();
const ledHardwareManager = new LEDHardwareManager();
const mqtt = new Mqtt(MQTT_DEFAULT_PORT);
const eventReader = new EventFileReader();
const driverRegistry = new DriverRegistry(driverPersistence, ledHardwareManager);
const systemMonitor = new SystemMonitor();
const discoveryService = new DiscoveryService(mqtt);

// Initialize mapping engine with context services
const udpClient = new UdpClientImpl(driverRegistry);
const mqttClient = new MqttClientWrapper(mqtt);
const stateStore = new StateStoreImpl();
const logger = new LoggerWrapper(log);

const mappingEngine = new MappingEngine({
  // Flatten UDP methods for convenience (most common operations)
  broadcast: udpClient.broadcast.bind(udpClient),
  send: udpClient.send.bind(udpClient),
  sendToDrivers: udpClient.sendToDrivers.bind(udpClient),
  // Keep full service objects for advanced use
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
  if (!isWindowAvailable() || !mainWindow) return;
  const status = systemMonitor.getSystemStatus(
    driverRegistry.getConnectedCount(),
    eventsProcessed
  );
  mainWindow.webContents.send('system:status', status);
}

// Helper to push driver configuration via MQTT
async function pushConfigToDriver(driverId: string): Promise<void> {
  // Get LED config (hardware ref + settings) from persistence
  const ledConfig = driverPersistence.getLEDConfig(driverId);

  if (!ledConfig) {
    throw new Error(`Driver ${driverId} has no LED configuration`);
  }

  // Load the hardware definition
  const hardware = ledHardwareManager.loadHardware(ledConfig.hardwareRef);

  if (!hardware) {
    throw new Error(`Failed to load LED hardware: ${ledConfig.hardwareRef}`);
  }

  // Combine hardware definition with driver-specific config (pin, offset) and settings
  const completeConfig = {
    name: hardware.name,
    description: hardware.description,
    version: '1.0',
    led_devices: [
      {
        id: 'device1',
        name: hardware.name,
        pin: ledConfig.pin,
        layout: hardware.layout,
        count: hardware.count,
        offset: ledConfig.offset ?? 0,
        chipset: hardware.chipset,
        color_order: hardware.colorOrder,
        max_brightness: ledConfig.maxBrightness,
        color_correction: hardware.colorCorrection,
        width: hardware.width,
        height: hardware.height,
      },
    ],
    settings: {
      global_brightness_limit: ledConfig.globalBrightnessLimit,
      dithering: ledConfig.dithering,
      power_supply_volts: ledConfig.powerSupplyVolts,
      max_power_milliamps: ledConfig.maxPowerMilliamps,
    },
  };

  // Publish complete config to driver-specific topic using driver ID
  const topic = `rgfx/driver/${driverId}/config`;
  const payload = JSON.stringify(completeConfig);

  await mqtt.publish(topic, payload);
  log.info(`Pushed LED configuration to driver ${driverId}: ${hardware.name} (${hardware.sku})`);
}

// Set up driver registry callbacks
driverRegistry.onDriverConnected((driver) => {
  const callbackTime = Date.now();
  log.info(`[DEBUG] onDriverConnected callback triggered for ${driver.id} at ${callbackTime}`);

  if (isWindowAvailable() && mainWindow) {
    mainWindow.webContents.send('driver:connected', driver);
    log.info(
      `[DEBUG] IPC driver:connected sent to renderer for ${driver.id} (elapsed: ${Date.now() - callbackTime}ms)`
    );
    sendSystemStatus();
  }

  // Note: Removed white pulse visual indicator - it was annoying during normal operation
  // Drivers remain dark unless actively showing game events

  // Auto-assign driver ID if needed (after factory reset, driver has no ID in NVS)
  // Driver sends empty ID in hostname, Hub looks up persisted ID and sends set-id command
  if (driver.sysInfo?.mac && driver.sysInfo.hostname) {
    const macAddress = driver.sysInfo.mac;
    const actualHostname = driver.sysInfo.hostname;

    // Check if driver sent empty ID (hostname ends with just "rgfx-driver-")
    if (actualHostname === 'rgfx-driver-' || actualHostname.endsWith('rgfx-driver-')) {
      const persistedDriver = driverPersistence.getDriverByMac(macAddress);
      if (persistedDriver) {
        const correctFullId = persistedDriver.id; // e.g., "rgfx-driver-0002"
        // Extract just the numeric/alphanumeric ID part (e.g., "0002")
        const idPart = correctFullId.replace(/^rgfx-driver-/, '');
        log.info(`Auto-assigning driver ID: ${macAddress} → ${idPart} (driver sent empty ID)`);

        // Send set-id command using MAC address (driver hasn't been assigned ID yet)
        const macWithDashes = macAddress.replace(/:/g, '-');
        const setIdTopic = `rgfx/driver/${macWithDashes}/set-id`;
        const setIdPayload = JSON.stringify({ id: idPart });
        void mqtt
          .publish(setIdTopic, setIdPayload)
          .then(() => {
            log.info(`Sent set-id command, driver will reconnect with ID: ${idPart}`);
          })
          .catch((error: unknown) => {
            log.error(`Failed to send set-id command:`, error);
          });
      }
    }
  }

  // Push configuration to driver when it connects
  void pushConfigToDriver(driver.id).catch((error: unknown) => {
    log.error(`Failed to push config to driver ${driver.id}:`, error);
  });
});

driverRegistry.onDriverDisconnected((driver) => {
  if (isWindowAvailable() && mainWindow) {
    mainWindow.webContents.send('driver:disconnected', driver);
    log.info(`Sent driver:disconnected event to renderer`);
    sendSystemStatus();
  }
});

// Start MQTT broker
mqtt.start();

// After broker starts, send discovery request to query all connected drivers
// Drivers will respond with connect messages containing current state
// The onDriverConnected callback will handle pushing config to each driver
// Use setTimeout to ensure broker is fully initialized
setTimeout(() => {
  log.info('Sending discovery request to all drivers...');
  void mqtt.publish(MQTT_TOPIC_DISCOVERY, '');
}, MQTT_BROKER_INIT_DELAY_MS);

// Install default mappers to user data directory (async)
void installDefaultMappers()
  .then(() => {
    // Load mapping engine handlers after installing defaults
    void mappingEngine.loadMappings();
  })
  .catch((error: unknown) => {
    log.error('Failed to install default mappers:', error);
  });

// Set up discovery service to process heartbeat cycles
discoveryService.onHeartbeatCycleComplete((respondedDriverIds) => {
  driverRegistry.processHeartbeatCycle(respondedDriverIds);
});

// Subscribe to driver connect messages (initial connection with system info)
mqtt.subscribe('rgfx/system/driver/connect', (_topic, payload) => {
  const mqttReceiveTime = Date.now();
  log.info(`[DEBUG] Driver connect MQTT received at ${mqttReceiveTime}`);

  try {
    // Type assertion via unknown - JSON.parse returns any, which we assert to our expected type
    const parsed = JSON.parse(payload) as unknown;
    const sysInfo = parsed as DriverSystemInfo;
    log.info(
      `[DEBUG] Driver connect parsed, calling registerDriver for ${sysInfo.mac} (elapsed: ${Date.now() - mqttReceiveTime}ms)`
    );
    driverRegistry.registerDriver(sysInfo);
    log.info(
      `[DEBUG] registerDriver completed for ${sysInfo.mac} (elapsed: ${Date.now() - mqttReceiveTime}ms)`
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log.error(`Failed to parse driver connect message: ${errorMessage}`);
  }
});

// Subscribe to driver heartbeat messages (simple keepalive)
mqtt.subscribe('rgfx/system/driver/heartbeat', (_topic, payload) => {
  try {
    // Heartbeat payload is just {"mac": "AA:BB:CC:DD:EE:FF"}
    const parsed = JSON.parse(payload) as { mac: string };
    const macAddress = parsed.mac;

    if (!macAddress) {
      log.error("Heartbeat message missing 'mac' field");
      return;
    }

    // Look up driver by MAC address to get the actual driver ID
    const persistedDriver = driverPersistence.getDriverByMac(macAddress);
    const driverId = persistedDriver?.id ?? macAddress;

    driverRegistry.updateHeartbeat(driverId);
    discoveryService.trackHeartbeatResponse(driverId);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log.error(`Failed to parse driver heartbeat message: ${errorMessage}`);
  }
});

// Subscribe to driver status changes (online/offline via LWT)
mqtt.subscribe('rgfx/driver/+/status', (topic, payload) => {
  log.info(`Driver status change: ${topic} = ${payload}`);

  // Extract driver ID from topic: rgfx/driver/{driver-id}/status
  const match = /^rgfx\/driver\/(.+)\/status$/.exec(topic);
  if (!match) {
    log.error(`Invalid status topic format: ${topic}`);
    return;
  }

  const driverId = match[1];
  const driver = driverRegistry.getDriver(driverId);

  if (!driver) {
    log.warn(`Status change from unknown driver: ${driverId}`);
    return;
  }

  // Update driver connection state based on status
  const wasConnected = driver.connected;
  driver.connected = payload === 'online';

  // If driver went offline, notify UI
  if (wasConnected && !driver.connected) {
    log.warn(`Driver ${driverId} went offline (LWT triggered)`);
    if (isWindowAvailable() && mainWindow) {
      mainWindow.webContents.send('driver:disconnected', driver);
    }
    sendSystemStatus();
  }
});

// Subscribe to driver test state changes (using wildcard for all drivers)
mqtt.subscribe('rgfx/driver/+/test/state', (topic, payload) => {
  log.info(`Test state change: ${topic} = ${payload}`);

  // Extract driver ID from topic: rgfx/driver/{driver-id}/test/state
  const match = /^rgfx\/driver\/(.+)\/test\/state$/.exec(topic);
  if (!match) {
    log.error(`Invalid test state topic format: ${topic}`);
    return;
  }

  const driverId = match[1];
  const driver = driverRegistry.getDriver(driverId);

  if (!driver) {
    log.warn(`Test state change from unknown driver: ${driverId}`);
    return;
  }

  // Update driver test state in memory
  driver.testActive = payload === 'on';

  // Notify renderer to update UI
  if (isWindowAvailable() && mainWindow) {
    mainWindow.webContents.send('driver:updated', driver);
  }
});

// Start reading events and send to mapping engine for processing
eventReader.start((topic, message) => {
  eventsProcessed++;
  void mappingEngine.handleEvent(topic, message);
  sendSystemStatus();
});

// IPC handler for LED test command
ipcMain.handle('driver:test-leds', async (_event, driverId: string, enabled: boolean) => {
  log.info(`LED test ${enabled ? 'ON' : 'OFF'} requested for driver ${driverId}`);

  const topic = `rgfx/driver/${driverId}/test`;

  if (enabled) {
    // Push config first, wait for MQTT confirmation, then send test command
    log.info(`Pushing LED configuration to driver ${driverId} before test...`);
    await pushConfigToDriver(driverId);
    await mqtt.publish(topic, 'on');
    log.info(`Test mode enabled for driver ${driverId}`);
  } else {
    await mqtt.publish(topic, 'off');
    log.info(`Test mode disabled for driver ${driverId}`);
  }
});

// IPC handler for setting driver ID (for future UI use)
ipcMain.handle('driver:set-id', async (_event, driverId: string, newId: string) => {
  try {
    // Validate new ID using centralized validator
    const validation = validateDriverId(newId);
    if (!validation.valid) {
      throw new Error(validation.error ?? 'Invalid driver ID');
    }

    // Get driver from persistence
    const driver = driverPersistence.getDriver(driverId);
    if (!driver) {
      throw new Error('Driver not found');
    }

    // Send set-id command via MQTT using driver ID
    const topic = `rgfx/driver/${driverId}/set-id`;
    const payload = JSON.stringify({ id: newId });

    await mqtt.publish(topic, payload);
    log.info(`Sent set-id command to ${driverId}: ${newId}`);

    // Update local config
    // Note: Driver will reconnect with new ID, which will update the registry
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error('Failed to set driver ID:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    title: `RGFX Hub v${pkg.version}`,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
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
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Open the DevTools in development mode only
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  // Wait for renderer to signal it's ready before sending initial state
  ipcMain.once('renderer:ready', () => {
    if (!isWindowAvailable() || !mainWindow) return;

    // Send all drivers (both connected and disconnected)
    driverRegistry.getAllDrivers().forEach((driver) => {
      if (isWindowAvailable() && mainWindow) {
        mainWindow.webContents.send('driver:connected', driver);
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
  // Load Redux DevTools extension in development mode
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const extensionPath = path.join(
      app.getPath('userData'),
      'extensions',
      'lmhkpmbekcpmknklioeibfkpmmfibljd'
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

  createWindow();

  // Start periodic driver discovery
  discoveryService.start();
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
  discoveryService.stop();
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
