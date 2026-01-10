/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';
import type { MqttBroker } from '../network';
import type { DriverRegistry } from '../driver-registry';
import { serializeDriverForIPC } from '../types';
import { sendToRenderer } from '../utils/driver-utils';

interface DriverTestStateDeps {
  mqtt: MqttBroker;
  driverRegistry: DriverRegistry;
  getMainWindow: () => Electron.BrowserWindow | null;
}

export function subscribeDriverTestState(deps: DriverTestStateDeps): void {
  const { mqtt, driverRegistry, getMainWindow } = deps;

  mqtt.subscribe('rgfx/driver/+/test/state', (topic, payload) => {
    log.info(`Test state change: ${topic} = ${payload}`);

    const match = /^rgfx\/driver\/(.+)\/test\/state$/.exec(topic);

    if (!match) {
      log.error(`Invalid test state topic format: ${topic}`);
      return;
    }

    const driverId = match[1];
    const driver = driverRegistry.getDriver(driverId);

    if (!driver) {
      log.warn(`Test state change from unknown driver: ${driverId}`);
      return;
    }

    driver.testActive = payload === 'on';

    log.info(`Sending driver:updated to renderer for ${driverId}`);
    sendToRenderer(getMainWindow, 'driver:updated', serializeDriverForIPC(driver));
  });
}
