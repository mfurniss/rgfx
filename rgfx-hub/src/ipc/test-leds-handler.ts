/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { DriverRegistry } from '../driver-registry';
import type { Mqtt } from '../mqtt';

interface TestLedsHandlerDeps {
  driverRegistry: DriverRegistry;
  mqtt: Mqtt;
  pushConfigToDriver: (macAddress: string) => Promise<void>;
}

export function registerTestLedsHandler(deps: TestLedsHandlerDeps): void {
  const { driverRegistry, mqtt, pushConfigToDriver } = deps;

  ipcMain.handle('driver:test-leds', async (_event, driverId: string, enabled: boolean) => {
    log.info(`LED test ${enabled ? 'ON' : 'OFF'} requested for driver ${driverId}`);

    const driver = driverRegistry.getDriver(driverId);
    if (!driver) {
      throw new Error(`No driver found with ID ${driverId}`);
    }

    if (!driver.mac) {
      throw new Error(`Driver ${driverId} has no MAC address`);
    }

    const topic = `rgfx/driver/${driverId}/test`;

    if (enabled) {
      log.info(`Pushing LED configuration to driver ${driverId} before test...`);
      await pushConfigToDriver(driver.mac);
      await mqtt.publish(topic, 'on');
      log.info(`Test mode enabled for driver ${driverId}`);
    } else {
      await mqtt.publish(topic, 'off');
      log.info(`Test mode disabled for driver ${driverId}`);
    }
  });
}
