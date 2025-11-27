/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { DriverRegistry } from '../driver-registry';
import type { MqttBroker } from '../mqtt';
import { validateDriverId } from '../driver-id-validator';

interface SetIdHandlerDeps {
  driverRegistry: DriverRegistry;
  mqtt: MqttBroker;
}

export function registerSetIdHandler(deps: SetIdHandlerDeps): void {
  const { driverRegistry, mqtt } = deps;

  ipcMain.handle('driver:set-id', async (_event, driverId: string, newId: string) => {
    try {
      const validation = validateDriverId(newId);

      if (!validation.valid) {
        throw new Error(validation.error ?? 'Invalid driver ID');
      }

      const driver = driverRegistry.getDriver(driverId);

      if (!driver) {
        throw new Error('Driver not found');
      }

      const topic = `rgfx/driver/${driverId}/set-id`;
      const payload = JSON.stringify({ id: newId });

      await mqtt.publish(topic, payload);
      log.info(`Sent set-id command to ${driverId}: ${newId}`);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('Failed to set driver ID:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });
}
