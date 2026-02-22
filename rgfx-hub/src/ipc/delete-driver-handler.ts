import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { DriverRegistry } from '../driver-registry';
import type { DriverConfig } from '../driver-config';
import type { SystemMonitor } from '../system-monitor';
import { requireDriver, sendToRenderer } from '../utils/driver-utils';
import { IPC } from '../config/ipc-channels';
import { INVOKE_CHANNELS } from './contract';

interface DeleteDriverHandlerDeps {
  driverRegistry: DriverRegistry;
  driverConfig: DriverConfig;
  systemMonitor: SystemMonitor;
  getMainWindow: () => BrowserWindow | null;
}

export function registerDeleteDriverHandler(deps: DeleteDriverHandlerDeps): void {
  const { driverRegistry, driverConfig, systemMonitor, getMainWindow } = deps;

  ipcMain.handle(INVOKE_CHANNELS.deleteDriver, (_event, driverId: string) => {
    log.info(`Deleting driver ${driverId}`);

    // Validate driver exists (don't need MAC for delete)
    requireDriver(driverId, driverRegistry);

    // Delete from persistence (drivers.json)
    const persistenceSuccess = driverConfig.deleteDriver(driverId);

    if (!persistenceSuccess) {
      throw new Error(`Failed to delete driver ${driverId} from persistence`);
    }

    // Delete from runtime registry
    driverRegistry.deleteDriver(driverId);

    // Clean up accumulated UDP stats for this driver
    systemMonitor.clearUdpStats(driverId);

    // Notify renderer that driver was deleted
    sendToRenderer(getMainWindow, IPC.DRIVER_DELETED, driverId);

    log.info(`Driver ${driverId} deleted successfully`);
    return { success: true };
  });
}
