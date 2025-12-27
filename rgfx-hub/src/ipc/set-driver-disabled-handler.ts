/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { DriverRegistry } from '../driver-registry';
import type { DriverPersistence } from '../driver-persistence';
import type { LEDHardwareManager } from '../led-hardware-manager';
import type { MqttBroker } from '../network';
import { serializeDriverForIPC } from '../types';

interface SetDriverDisabledHandlerDeps {
  driverRegistry: DriverRegistry;
  driverPersistence: DriverPersistence;
  ledHardwareManager: LEDHardwareManager;
  mqtt: MqttBroker;
  getMainWindow: () => BrowserWindow | null;
}

export function registerSetDriverDisabledHandler(deps: SetDriverDisabledHandlerDeps): void {
  const { driverRegistry, driverPersistence, ledHardwareManager, mqtt, getMainWindow } = deps;

  ipcMain.handle(
    'driver:set-disabled',
    (_event, driverId: string, disabled: boolean) => {
      log.info(`Setting disabled state for driver ${driverId}: ${disabled}`);

      const driver = driverRegistry.getDriver(driverId);

      if (!driver) {
        throw new Error(`No driver found with ID ${driverId}`);
      }

      if (!driver.mac) {
        throw new Error(`Driver ${driverId} has no MAC address`);
      }

      // Update persistence
      const success = driverPersistence.setDisabled(driverId, disabled);

      if (!success) {
        throw new Error(`Failed to update disabled state for driver ${driverId}`);
      }

      // When disabling, immediately clear effects on the driver
      if (disabled) {
        const topic = `rgfx/driver/${driver.mac}/clear-effects`;
        void mqtt.publish(topic, '');
        log.info(`Sent clear-effects command to driver ${driverId} (${driver.mac})`);
      }

      // Refresh driver from persistence to update runtime state
      const updatedDriver = driverRegistry.refreshDriverFromPersistence(
        driver.mac,
        ledHardwareManager,
      );

      if (updatedDriver) {
        // Notify renderer of updated driver
        const mainWindow = getMainWindow();

        if (mainWindow !== null && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('driver:updated', serializeDriverForIPC(updatedDriver));
        }
      }

      log.info(`Driver ${driverId} disabled state set to ${disabled}`);
      return { success: true };
    },
  );
}
