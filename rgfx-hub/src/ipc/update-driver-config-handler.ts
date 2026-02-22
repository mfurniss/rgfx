import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { DriverRegistry } from '../driver-registry';
import { requireDriverWithMac } from '../utils/driver-utils';
import { INVOKE_CHANNELS } from './contract';

interface UploadDriverConfigHandlerDeps {
  driverRegistry: DriverRegistry;
  uploadConfigToDriver: (macAddress: string) => Promise<boolean>;
}

export function registerUpdateDriverConfigHandler(deps: UploadDriverConfigHandlerDeps): void {
  const { driverRegistry, uploadConfigToDriver } = deps;

  ipcMain.handle(INVOKE_CHANNELS.updateDriverConfig, async (_event, driverId: string) => {
    log.info(`Update config requested for driver ${driverId}`);

    const driver = requireDriverWithMac(driverId, driverRegistry);

    log.info(`Updating LED configuration for driver ${driverId}...`);
    await uploadConfigToDriver(driver.mac);
    log.info(`Configuration updated for driver ${driverId}`);
  });
}
