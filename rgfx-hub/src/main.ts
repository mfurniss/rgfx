import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import log from 'electron-log/main';
import { Mqtt } from './mqtt';
import { Udp } from './udp';
import { EventFileReader } from './EventFileReader';
import type { Device, SystemStatus } from './types';

// Initialize electron-log
log.initialize();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

log.info('RGFX Hub starting...');

// Device registry
const devices = new Map<string, Device>();
let mainWindow: BrowserWindow | null = null;

// Initialize MQTT broker and UDP sender
const mqtt = new Mqtt(1883);
const udp = new Udp('192.168.10.86', 1234);
const eventReader = new EventFileReader();

// Track if we're already checking connection after UDP failure
let checkingConnectionAfterUdpFailure = false;

// Helper to find device by IP
function findDeviceByIp(ip: string): Device | undefined {
  for (const device of devices.values()) {
    if (device.ip === ip) {
      return device;
    }
  }
  return undefined;
}

// Helper to increment UDP stats for device
function trackUdpSend(success: boolean) {
  const device = findDeviceByIp(udp.ip);
  if (device) {
    if (success) {
      device.stats.udpMessagesSent++;
      log.info(`UDP sent to ${device.name}: ${device.stats.udpMessagesSent} total`);
    } else {
      device.stats.udpMessagesFailed++;
      log.info(`UDP failed to ${device.name}: ${device.stats.udpMessagesFailed} total`);
    }
    devices.set(device.id, device);

    // Send updated device to renderer
    if (mainWindow) {
      mainWindow.webContents.send('device:connected', device);
    }
  } else {
    log.warn(`trackUdpSend: No device found with IP ${udp.ip}`);
  }
}

// Set up UDP callbacks
udp.setSentCallback(() => {
  trackUdpSend(true);
});

udp.setErrorCallback((err) => {
  log.error(`UDP error detected: ${err.message}`);

  // Track UDP failure
  trackUdpSend(false);

  // Only trigger one MQTT check at a time
  if (!checkingConnectionAfterUdpFailure) {
    checkingConnectionAfterUdpFailure = true;
    log.info('First UDP failure - triggering immediate MQTT connection check');

    // Send discovery request immediately
    sendDiscoveryRequest();

    // Reset flag after 5 seconds (timeout period)
    setTimeout(() => {
      checkingConnectionAfterUdpFailure = false;
    }, 5000);
  }
});

// Start MQTT broker
mqtt.start();

// Send periodic discovery requests to find drivers
let discoveryInterval: NodeJS.Timeout;
let timeoutCheckInterval: NodeJS.Timeout;

// Device timeout threshold (35 seconds = 30s poll + 5s grace)
const DEVICE_TIMEOUT_MS = 35000;

function startDiscovery() {
  // Send discovery request immediately on startup
  sendDiscoveryRequest();

  // Then send every 30 seconds
  discoveryInterval = setInterval(() => {
    sendDiscoveryRequest();
  }, 30000);

  // Check for timed-out devices every 5 seconds
  timeoutCheckInterval = setInterval(() => {
    checkDeviceTimeouts();
  }, 5000);
}

function sendDiscoveryRequest() {
  log.info('Sending driver discovery request...');
  mqtt.publish('rgfx/system/discover', 'ping');
}

function checkDeviceTimeouts() {
  const now = Date.now();
  let disconnectedCount = 0;

  log.info(`Checking device timeouts for ${devices.size} devices...`);

  devices.forEach((device, deviceId) => {
    const timeSinceLastSeen = now - device.lastSeen;
    log.info(`Device ${device.name}: connected=${device.connected}, lastSeen=${timeSinceLastSeen}ms ago, threshold=${DEVICE_TIMEOUT_MS}ms`);

    if (device.connected && timeSinceLastSeen > DEVICE_TIMEOUT_MS) {
      log.info(`Device ${device.name} (${deviceId}) timed out - marking as disconnected`);

      // Mark as disconnected
      device.connected = false;
      devices.set(deviceId, device);

      // Notify renderer with updated device object
      if (mainWindow) {
        mainWindow.webContents.send('device:disconnected', device);
        log.info(`Sent device:disconnected event to renderer`);
        disconnectedCount++;
      }
    }
  });

  // Update system status if any devices disconnected
  if (disconnectedCount > 0) {
    sendSystemStatus();
  }
}

// Helper to get Hub's local IP address
function getLocalIpAddress(): string {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();

  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'Unknown';
}

// Helper to send system status to renderer
function sendSystemStatus() {
  if (!mainWindow) return;

  // Count only connected devices
  let connectedCount = 0;
  devices.forEach((device) => {
    if (device.connected) {
      connectedCount++;
    }
  });

  const status: SystemStatus = {
    mqttBroker: 'running',
    udpServer: 'active',
    eventReader: 'monitoring',
    devicesConnected: connectedCount,
    hubIp: getLocalIpAddress(),
  };

  mainWindow.webContents.send('system:status', status);
}

// Subscribe to driver connect messages (also used for discovery responses)
mqtt.subscribe('rgfx/system/driver/connect', (_topic, payload) => {
  log.info(`Driver response received`);

  try {
    // Parse JSON payload from driver
    const sysInfo = JSON.parse(payload);

    const deviceId = sysInfo.mac || sysInfo.ip || 'unknown';
    const existingDevice = devices.get(deviceId);
    const now = Date.now();

    const device: Device = {
      id: deviceId,
      name: sysInfo.hostname || sysInfo.ip || 'Driver',
      type: 'driver',
      connected: true,
      lastSeen: now,
      firstSeen: existingDevice?.firstSeen || now,
      ip: sysInfo.ip,
      sysInfo: sysInfo,
      stats: {
        mqttMessagesReceived: (existingDevice?.stats.mqttMessagesReceived || 0) + 1,
        mqttMessagesFailed: existingDevice?.stats.mqttMessagesFailed || 0,
        udpMessagesSent: existingDevice?.stats.udpMessagesSent || 0,
        udpMessagesFailed: existingDevice?.stats.udpMessagesFailed || 0,
      },
    };

    devices.set(device.id, device);

    // Only send device:connected event to renderer if this is a new device or was previously disconnected
    if (!existingDevice || !existingDevice.connected) {
      log.info(`New device connected: ${device.name} (${deviceId})`);
      if (mainWindow) {
        mainWindow.webContents.send('device:connected', device);
        sendSystemStatus();
      }
    } else {
      // Just update lastSeen for existing connected device (heartbeat)
      log.info(`Heartbeat from ${device.name} (${deviceId})`);
    }
  } catch (err) {
    log.error(`Failed to parse driver connect message: ${err}`);

    // Track MQTT failure if we can identify the device
    // This would require correlating the failed message with a device somehow
  }
});

// Map game events to LED effects
function handleGameEvent(topic: string, message: string) {
  // Power pill state change
  if (topic === 'player/pill/state') {
    const state = parseInt(message);
    if (state > 0) {
      // Power pill active - blue pulse
      udp.send('pulse', '0x0000FF');
    } else {
      // Power pill ended - return to normal
      udp.send('pulse', '0xFF0000');
    }
  }
  // Score changes - quick flash
  else if (topic.startsWith('player/score/')) {
    udp.send('pulse', '0xFFFF00');
  }
}

// Start reading events and send UDP for each event (minimal logging for low latency)
eventReader.start((topic, message) => {
  handleGameEvent(topic, message);
});

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // and load the index.html of the app.
  // if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
  //   mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  // } else {
  //   mainWindow.loadFile(
  //     path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
  //   );
  // }

  mainWindow.loadURL('http://localhost:5173');

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  // Send initial system status once window is ready
  mainWindow.webContents.on('did-finish-load', () => {
    // Small delay to ensure renderer IPC listeners are set up
    setTimeout(() => {
      // Send all devices (both connected and disconnected)
      devices.forEach((device) => {
        mainWindow?.webContents.send('device:connected', device);
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
app.on('ready', () => {
  createWindow();

  // Start periodic driver discovery
  startDiscovery();
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
app.on('before-quit', async () => {
  log.info('Shutting down...');

  // Stop intervals
  if (discoveryInterval) {
    clearInterval(discoveryInterval);
  }
  if (timeoutCheckInterval) {
    clearInterval(timeoutCheckInterval);
  }

  udp.stop();
  await mqtt.stop();
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
