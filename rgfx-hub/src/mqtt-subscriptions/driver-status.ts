/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { BrowserWindow } from 'electron';
import log from 'electron-log/main';
import type { MqttBroker } from '../network';
import type { DriverRegistry } from '../driver-registry';
import type { SystemMonitor } from '../system-monitor';
import { serializeDriverForIPC } from '../types';

interface DriverStatusDeps {
  mqtt: MqttBroker;
  driverRegistry: DriverRegistry;
  getMainWindow: () => BrowserWindow | null;
  systemMonitor: SystemMonitor;
  getEventsProcessed: () => number;
}

export function subscribeDriverStatus(deps: DriverStatusDeps): void {
  const { mqtt, driverRegistry, getMainWindow, systemMonitor, getEventsProcessed } = deps;

  mqtt.subscribe('rgfx/driver/+/status', (topic, payload) => {
    log.info(`Driver status change: ${topic} = ${payload}`);

    const match = /^rgfx\/driver\/(.+)\/status$/.exec(topic);

    if (!match) {
      log.error(`Invalid status topic format: ${topic}`);
      return;
    }

    const driverId = match[1];
    const driver = driverRegistry.getDriver(driverId);

    if (!driver) {
      log.warn(`Status change from unknown driver: ${driverId}`);
      return;
    }

    const mainWindow = getMainWindow();

    if (payload === 'offline' && driver.connected) {
      log.warn(`Driver ${driverId} went offline (LWT triggered)`);
      driver.ip = undefined;

      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('driver:disconnected', serializeDriverForIPC(driver));
        const status = systemMonitor.getSystemStatus(
          driverRegistry.getConnectedCount(),
          getEventsProcessed(),
        );
        mainWindow.webContents.send('system:status', status);
      }
    } else if (payload === 'online') {
      log.info(`Driver ${driverId} LWT status: online (waiting for connect message)`);
    }
  });
}
