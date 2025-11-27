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

interface SendDriverCommandHandlerDeps {
  driverRegistry: DriverRegistry;
  mqtt: MqttBroker;
}

export function registerSendDriverCommandHandler(deps: SendDriverCommandHandlerDeps): void {
  const { driverRegistry, mqtt } = deps;

  ipcMain.handle(
    'driver:send-command',
    async (_event, driverId: string, command: string, payload?: string) => {
      log.info(`Command '${command}' requested for driver ${driverId}${payload ? ` with payload: ${payload}` : ''}`);

      const driver = driverRegistry.getDriver(driverId);

      if (!driver) {
        throw new Error(`No driver found with ID ${driverId}`);
      }

      const topic = `rgfx/driver/${driverId}/${command}`;

      if (payload !== undefined) {
        await mqtt.publish(topic, payload);
      } else {
        await mqtt.publish(topic, '');
      }

      log.info(`Command '${command}' sent to driver ${driverId}`);
    },
  );
}
