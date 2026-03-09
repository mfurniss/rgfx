import { app, ipcMain, Menu, shell } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import pkg from '../package.json';

// Set app name and dock icon for dev mode (in production, these come from the packaged app)
app.setName('rgfx-hub');

if (process.platform === 'darwin' && app.dock && !app.isPackaged) {
  app.dock.setIcon(path.join(app.getAppPath(), 'assets/icons/icons/512x512.png'));
}

import { configureZod } from './config/zod-config';
import { initializeLogging } from './config/logging';
import { registerGlobalErrorHandlers } from './services/global-error-handler';
import { createSystemErrorTracker } from './services/system-error-tracker';
import { createEventStats } from './services/event-stats';
import { createServices } from './services/service-factory';
import { eventBus } from './services/event-bus';
import { createWindowManager } from './window';
import { startServices, type PowerSaveHandle } from './services/service-startup';
import { registerAppLifecycleHandlers } from './lifecycle';
import { ConfigError } from './errors/config-error';
import { MAX_SYSTEM_ERRORS } from './config/constants';
import { INVOKE_CHANNELS, SEND_CHANNELS } from './ipc/contract';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (started) {
  app.quit();
}

// Prevent multiple instances — focus existing window if already running
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}

// Configure Zod for user-friendly error messages
configureZod();

// Initialize logging
const log = initializeLogging();
log.info(`RGFX Hub ${pkg.version} starting...`);

// Register global error handlers to prevent crashes from socket errors
registerGlobalErrorHandlers(log);

// Create system error tracker and event stats
const systemErrorTracker = createSystemErrorTracker(MAX_SYSTEM_ERRORS);
const eventStats = createEventStats();

// Initialize services
const configPath = path.join(app.getPath('home'), '.rgfx');

// Create services (includes loading driver config which may throw ConfigError)
let services: ReturnType<typeof createServices>;

try {
  services = createServices(configPath, log);
} catch (error) {
  if (error instanceof ConfigError) {
    log.error(`Critical config error: ${error.message}`);
    log.error(`Details: ${error.details}`);
    systemErrorTracker.addError(error.toSystemError());
    // Re-throw to prevent app from starting with corrupt config
    throw error;
  }
  throw error;
}

// Create window manager with all dependencies
const windowManager = createWindowManager({
  systemMonitor: services.systemMonitor,
  driverRegistry: services.driverRegistry,
  systemErrorTracker,
  log,
});

// Set application menu with Help > Documentation
const isMac = process.platform === 'darwin';
const menuTemplate: Electron.MenuItemConstructorOptions[] = [
  ...(isMac ? [{ role: 'appMenu' as const }] : []),
  { role: 'fileMenu' as const },
  { role: 'editMenu' as const },
  { role: 'viewMenu' as const },
  {
    role: 'help' as const,
    submenu: [
      {
        label: 'Documentation',
        click: () => void shell.openExternal('https://rgfx.io/docs'),
      },
    ],
  },
];
Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate));

// Subscribe to network changes to update system status
eventBus.on('network:changed', () => {
  windowManager.sendSystemStatus();
});

// Start services if no critical errors (corrupt config files)
let powerSaveHandle: PowerSaveHandle | null = null;

if (!systemErrorTracker.hasCriticalError()) {
  powerSaveHandle = startServices({
    services,
    windowManager,
    systemErrorTracker,
    eventStats,
    hubVersion: pkg.version,
    log,
  });
} else {
  log.error('Critical config error detected - services not started');
}

// Register critical error IPC handlers (always available, even in error state)
ipcMain.handle(INVOKE_CHANNELS.showInFolder, (_event, filePath: string) => {
  shell.showItemInFolder(filePath);
});

ipcMain.on(SEND_CHANNELS.quitApp, () => {
  app.quit();
});

// Register app lifecycle handlers (ready, quit, activate, etc.)
registerAppLifecycleHandlers({
  services,
  windowManager,
  powerSaveHandle,
  log,
});
