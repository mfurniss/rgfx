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
import type { DriverConfig } from '../driver-config';
import type { MqttBroker } from '../network';
import { serializeDriverForIPC } from '../types';
import {
  requireDriverWithMac,
  buildDriverTopic,
  sendToRenderer,
} from '../utils/driver-utils';

interface SetDriverDisabledHandlerDeps {
  driverRegistry: DriverRegistry;
  driverConfig: DriverConfig;
  mqtt: MqttBroker;
  getMainWindow: () => BrowserWindow | null;
}

export function registerSetDriverDisabledHandler(deps: SetDriverDisabledHandlerDeps): void {
  const { driverRegistry, driverConfig, mqtt, getMainWindow } = deps;

  ipcMain.handle(
    'driver:set-disabled',
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
        sendToRenderer(getMainWindow, 'driver:updated', serializeDriverForIPC(updatedDriver));
      }

      log.info(`Driver ${driverId} disabled state set to ${disabled}`);
      return { success: true };
    },
  );
}
