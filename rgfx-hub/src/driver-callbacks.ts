import type { BrowserWindow } from 'electron';
import log from 'electron-log/main';
import type { SystemMonitor } from './system-monitor';
import type { DriverConnectService } from './services/driver-connect-service';
import { sendToRenderer } from './utils/driver-utils';
import { eventBus } from './services/event-bus';
import { IPC } from './config/ipc-channels';

interface DriverEventHandlersDeps {
  systemMonitor: SystemMonitor;
  driverConnectService: DriverConnectService;
  getMainWindow: () => BrowserWindow | null;
}

/**
 * Sets up event handlers for driver lifecycle events.
 * Routes event bus events to renderer IPC and delegates
 * business logic to dedicated services.
 */
export function setupDriverEventHandlers(deps: DriverEventHandlersDeps): void {
  const { systemMonitor, driverConnectService, getMainWindow } = deps;

  function sendSystemStatus() {
    const status = systemMonitor.getFullStatus();
    sendToRenderer(getMainWindow, IPC.SYSTEM_STATUS, status);
  }

  eventBus.on('driver:connected', ({ driver }) => {
    sendToRenderer(getMainWindow, IPC.DRIVER_CONNECTED, driver);
    sendSystemStatus();
    driverConnectService.onDriverConnected(driver);
  });

  eventBus.on('driver:disconnected', ({ driver, reason }) => {
    sendToRenderer(getMainWindow, IPC.DRIVER_DISCONNECTED, driver, reason);
    log.info(`Sent driver:disconnected event to renderer (reason: ${reason})`);
    sendSystemStatus();
  });

  eventBus.on('driver:updated', ({ driver }) => {
    sendToRenderer(getMainWindow, IPC.DRIVER_UPDATED, driver);
  });

  eventBus.on('driver:restarting', ({ driver }) => {
    sendToRenderer(getMainWindow, IPC.DRIVER_RESTARTING, driver);
    log.info(`Sent driver:restarting event to renderer for ${driver.id}`);
    sendSystemStatus();
  });

  for (const event of [
    IPC.FLASH_OTA_STATE,
    IPC.FLASH_OTA_PROGRESS,
    IPC.FLASH_OTA_ERROR,
  ] as const) {
    eventBus.on(event, (data) => {
      sendToRenderer(getMainWindow, event, data);
    });
  }
}
