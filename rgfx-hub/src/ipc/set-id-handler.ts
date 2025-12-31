/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { DriverRegistry } from '../driver-registry';
import type { MqttBroker } from '../network';
import { validateDriverId } from '../driver-id-validator';
import { requireDriverWithMac, buildDriverTopic } from '../utils/driver-utils';

interface SetIdHandlerDeps {
  driverRegistry: DriverRegistry;
  mqtt: MqttBroker;
}

export function registerSetIdHandler(deps: SetIdHandlerDeps): void {
  const { driverRegistry, mqtt } = deps;

  ipcMain.handle('driver:set-id', async (_event, driverId: string, newId: string): Promise<void> => {
    const validation = validateDriverId(newId);

    if (!validation.valid) {
      throw new Error(validation.error ?? 'Invalid driver ID');
    }

    const driver = requireDriverWithMac(driverId, driverRegistry);
    const topic = buildDriverTopic(driver.mac, 'set-id');
    const payload = JSON.stringify({ id: newId });

    await mqtt.publish(topic, payload);
    log.info(`Sent set-id command to ${driverId} (${driver.mac}): ${newId}`);
  });
}
