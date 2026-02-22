import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { DriverRegistry } from '../driver-registry';
import type { DriverConfig } from '../driver-config';
import type { MqttBroker } from '../network';

import {
  requireDriverWithMac,
  buildDriverTopic,
  sendToRenderer,
} from '../utils/driver-utils';
import { IPC } from '../config/ipc-channels';
import { INVOKE_CHANNELS } from './contract';

interface SetDriverDisabledHandlerDeps {
  driverRegistry: DriverRegistry;
  driverConfig: DriverConfig;
  mqtt: MqttBroker;
  getMainWindow: () => BrowserWindow | null;
}

export function registerSetDriverDisabledHandler(deps: SetDriverDisabledHandlerDeps): void {
  const { driverRegistry, driverConfig, mqtt, getMainWindow } = deps;

  ipcMain.handle(
    INVOKE_CHANNELS.setDriverDisabled,
    (_event, driverId: string, disabled: boolean) => {
      log.info(`Setting disabled state for driver ${driverId}: ${disabled}`);

      const driver = requireDriverWithMac(driverId, driverRegistry);

      // Update persistence
      const success = driverConfig.setDisabled(driverId, disabled);

      if (!success) {
        throw new Error(`Failed to update disabled state for driver ${driverId}`);
      }

      // When disabling, immediately clear effects on the driver
      if (disabled) {
        const topic = buildDriverTopic(driver.mac, 'clear-effects');
        void mqtt.publish(topic, '');
        log.info(`Sent clear-effects command to driver ${driverId} (${driver.mac})`);
      }

      // Refresh driver from persistence to update runtime state
      const updatedDriver = driverRegistry.refreshDriverFromConfig(driver.mac);

      if (updatedDriver) {
        sendToRenderer(getMainWindow, IPC.DRIVER_UPDATED, updatedDriver);
      }

      log.info(`Driver ${driverId} disabled state set to ${disabled}`);
      return { success: true };
    },
  );
}
