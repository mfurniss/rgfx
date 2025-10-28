/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { app, BrowserWindow, session } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import log from "electron-log/main";
import { Mqtt } from "./mqtt";
import { Udp } from "./udp";
import { EventFileReader } from "./event-file-reader";
import { DriverRegistry } from "./driver-registry";
import { SystemMonitor } from "./system-monitor";
import { DiscoveryService } from "./discovery-service";
import { GameEventMapper } from "./game-event-mapper";
import { DriverConfigManager } from "./driver-config-manager";
import { DriverPersistence } from "./driver-persistence";
import type { DriverSystemInfo } from "./types";
import pkg from "../package.json";

// Vite environment variables injected by Electron Forge
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Initialize electron-log
log.initialize();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

log.info(`RGFX Hub v${pkg.version} starting...`);

// Window reference
let mainWindow: BrowserWindow | null = null;

// Initialize services (persistence first, then registry)
const driverPersistence = new DriverPersistence();
const mqtt = new Mqtt(1883);
const eventReader = new EventFileReader();
const driverRegistry = new DriverRegistry(driverPersistence);
const systemMonitor = new SystemMonitor();
const discoveryService = new DiscoveryService(mqtt);
const gameEventMapper = new GameEventMapper(driverRegistry);
const driverConfigManager = new DriverConfigManager();

// Helper to safely check if window is available and not destroyed
function isWindowAvailable(): boolean {
  return mainWindow !== null && !mainWindow.isDestroyed();
}

// Helper to send system status to renderer
function sendSystemStatus() {
  if (!isWindowAvailable() || !mainWindow) return;
  const status = systemMonitor.getSystemStatus(driverRegistry.getConnectedCount());
  mainWindow.webContents.send("system:status", status);
}

// Helper to push driver configuration via MQTT
function pushConfigToDriver(driverId: string): boolean {
  try {
    // Get LED configuration from persistence (new unified system)
    const config = driverPersistence.getDriverLEDConfig(driverId);

    // Fall back to old config manager for migration period
    const legacyConfig = driverConfigManager.getConfig(driverId);
    const finalConfig = config ?? legacyConfig;

    if (!finalConfig) {
      log.warn(`Driver ${driverId} connected but has no LED configuration - user must configure before use`);
      return false;
    }

    // Publish to driver-specific topic
    const topic = `rgfx/driver/${driverId}/config`;
    const payload = JSON.stringify(finalConfig);

    mqtt.publish(topic, payload);
    log.info(`Pushed LED configuration to driver ${driverId} (${finalConfig.friendly_name ?? 'unnamed'})`);
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log.error(`Failed to push config to driver ${driverId}: ${errorMessage}`);
    return false;
  }
}

// Set up driver registry callbacks
driverRegistry.onDriverConnected((driver) => {
  if (isWindowAvailable() && mainWindow) {
    mainWindow.webContents.send("driver:connected", driver);
    sendSystemStatus();
  }

  // Send white pulse for known drivers reconnecting (not brand new drivers)
  // If firstSeen and lastSeen are close (within 5 seconds), it's a new driver
  const isNewDriver = (driver.lastSeen - driver.firstSeen) < 5000;

  if (!isNewDriver && driver.ip) {
    const udp = new Udp(driver.ip, 1234);
    udp.send("pulse", "0xFFFFFF"); // White pulse
    log.info(`Sent white pulse to reconnected driver ${driver.name} (${driver.ip})`);
  }

  // Push configuration to driver when it connects
  pushConfigToDriver(driver.id);
});

driverRegistry.onDriverDisconnected((driver) => {
  if (isWindowAvailable() && mainWindow) {
    mainWindow.webContents.send("driver:disconnected", driver);
    log.info(`Sent driver:disconnected event to renderer`);
    sendSystemStatus();
  }
});

// Start MQTT broker
mqtt.start();

// Set up discovery service to check timeouts
discoveryService.onTimeoutCheck(() => {
  driverRegistry.checkTimeouts();
});

// Subscribe to driver connect messages (initial connection with system info)
mqtt.subscribe("rgfx/system/driver/connect", (_topic, payload) => {
  log.info(`Driver connect message received`);

  try {
    // Type assertion via unknown - JSON.parse returns any, which we assert to our expected type
    const parsed = JSON.parse(payload) as unknown;
    const sysInfo = parsed as DriverSystemInfo;
    driverRegistry.registerDriver(sysInfo);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log.error(`Failed to parse driver connect message: ${errorMessage}`);
  }
});

// Subscribe to driver heartbeat messages (simple keepalive)
mqtt.subscribe("rgfx/system/driver/heartbeat", (_topic, payload) => {
  try {
    // Heartbeat payload is just {"mac": "AA:BB:CC:DD:EE:FF"}
    const parsed = JSON.parse(payload) as { mac: string };
    const driverId = parsed.mac;

    if (!driverId) {
      log.error("Heartbeat message missing 'mac' field");
      return;
    }

    driverRegistry.updateHeartbeat(driverId);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    log.error(`Failed to parse driver heartbeat message: ${errorMessage}`);
  }
});

// Start reading events and send UDP for each event (minimal logging for low latency)
eventReader.start((topic, message) => {
  gameEventMapper.handleEvent(topic, message);
});

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    title: `RGFX Hub v${pkg.version}`,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
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
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools in development mode only
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  // Send initial system status once window is ready
  mainWindow.webContents.on("did-finish-load", () => {
    // Small delay to ensure renderer IPC listeners are set up
    setTimeout(() => {
      if (!isWindowAvailable() || !mainWindow) return;

      // Send all drivers (both connected and disconnected)
      driverRegistry.getAllDrivers().forEach((driver) => {
        if (isWindowAvailable() && mainWindow) {
          mainWindow.webContents.send("driver:connected", driver);
        }
      });
      // Send system status
      sendSystemStatus();
    }, 100);
  });

  return mainWindow;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  // Load Redux DevTools extension in development mode
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const extensionPath = path.join(
      app.getPath('userData'),
      'extensions',
      'lmhkpmbekcpmknklioeibfkpmmfibljd'
    );

    session.defaultSession.extensions.loadExtension(extensionPath, {
      allowFileAccess: true
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
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// Cleanup on app quit
app.on("before-quit", () => {
  log.info("Shutting down...");

  // Stop services
  discoveryService.stop();
  void mqtt.stop();
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
