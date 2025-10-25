import { app, BrowserWindow } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import log from "electron-log/main";
import { Mqtt } from "./mqtt";
import { Udp } from "./udp";
import { EventFileReader } from "./EventFileReader";
import { DriverRegistry } from "./DriverRegistry";
import { SystemMonitor } from "./SystemMonitor";
import { DiscoveryService } from "./DiscoveryService";
import { GameEventMapper } from "./GameEventMapper";

// Vite environment variables injected by Electron Forge
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

// Initialize electron-log
log.initialize();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

log.info("RGFX Hub starting...");

// Window reference
let mainWindow: BrowserWindow | null = null;

// Initialize services
const mqtt = new Mqtt(1883);
const udp = new Udp("192.168.10.86", 1234);
const eventReader = new EventFileReader();
const driverRegistry = new DriverRegistry();
const systemMonitor = new SystemMonitor();
const discoveryService = new DiscoveryService(mqtt);
const gameEventMapper = new GameEventMapper(udp);

// Track if we're already checking connection after UDP failure
let checkingConnectionAfterUdpFailure = false;

// Helper to send system status to renderer
function sendSystemStatus() {
  if (!mainWindow) return;
  const status = systemMonitor.getSystemStatus(driverRegistry.getConnectedCount());
  mainWindow.webContents.send("system:status", status);
}

// Set up driver registry callbacks
driverRegistry.onDriverConnected((device) => {
  if (mainWindow) {
    mainWindow.webContents.send("device:connected", device);
    sendSystemStatus();
  }
});

driverRegistry.onDriverDisconnected((device) => {
  if (mainWindow) {
    mainWindow.webContents.send("device:disconnected", device);
    log.info(`Sent device:disconnected event to renderer`);
    sendSystemStatus();
  }
});

// Set up UDP callbacks
udp.setSentCallback(() => {
  driverRegistry.trackUdpSent(udp.ip, true);
});

udp.setErrorCallback((err) => {
  log.error(`UDP error detected: ${err.message}`);
  driverRegistry.trackUdpSent(udp.ip, false);

  // Only trigger one MQTT check at a time
  if (!checkingConnectionAfterUdpFailure) {
    checkingConnectionAfterUdpFailure = true;
    log.info("First UDP failure - triggering immediate MQTT connection check");
    discoveryService.triggerImmediateDiscovery();

    // Reset flag after 5 seconds (timeout period)
    setTimeout(() => {
      checkingConnectionAfterUdpFailure = false;
    }, 5000);
  }
});

// Start MQTT broker
mqtt.start();

// Set up discovery service to check timeouts
discoveryService.onTimeoutCheck(() => {
  driverRegistry.checkTimeouts();
});

// Subscribe to driver connect messages (also used for discovery responses)
mqtt.subscribe("rgfx/system/driver/connect", (_topic, payload) => {
  log.info(`Driver response received`);

  try {
    const sysInfo = JSON.parse(payload);
    driverRegistry.registerDriver(sysInfo);
  } catch (err) {
    log.error(`Failed to parse driver connect message: ${err}`);
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
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    log.info(`Loading production build from: ${MAIN_WINDOW_VITE_NAME}`);
    mainWindow.loadFile(
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
      // Send all drivers (both connected and disconnected)
      driverRegistry.getAllDrivers().forEach((device) => {
        mainWindow?.webContents.send("device:connected", device);
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
app.on("before-quit", async () => {
  log.info("Shutting down...");

  // Stop services
  discoveryService.stop();
  udp.stop();
  await mqtt.stop();
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
