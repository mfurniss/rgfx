import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { DriverRegistry } from '../driver-registry';
import type { MqttBroker } from '../network';
import { rebootDriver } from '../services/driver-service';
import { requireDriver } from '../utils/driver-utils';
import { INVOKE_CHANNELS } from './contract';

interface RestartDriverHandlerDeps {
  driverRegistry: DriverRegistry;
  mqtt: MqttBroker;
}

export function registerRestartDriverHandler(deps: RestartDriverHandlerDeps): void {
  const { driverRegistry, mqtt } = deps;

  ipcMain.handle(INVOKE_CHANNELS.restartDriver, async (_event, driverId: string) => {
    log.info(`Restart requested for driver ${driverId}`);

    const driver = requireDriver(driverId, driverRegistry);

    if (driver.state !== 'connected') {
      throw new Error(`Driver ${driverId} is not connected`);
    }

    await rebootDriver(driver, { mqtt });

    return { success: true };
  });
}
