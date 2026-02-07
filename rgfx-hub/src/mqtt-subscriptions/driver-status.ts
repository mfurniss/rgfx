/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';
import type { MqttBroker } from '../network';
import type { DriverRegistry } from '../driver-registry';
import type { SystemMonitor } from '../system-monitor';

import { sendToRenderer } from '../utils/driver-utils';
import { IPC } from '../config/ipc-channels';

interface DriverStatusDeps {
  mqtt: MqttBroker;
  driverRegistry: DriverRegistry;
  getMainWindow: () => Electron.BrowserWindow | null;
  systemMonitor: SystemMonitor;
  getEventsProcessed: () => number;
  getEventLogSizeBytes: () => number;
}

export function subscribeDriverStatus(deps: DriverStatusDeps): void {
  const {
    mqtt, driverRegistry, getMainWindow, systemMonitor, getEventsProcessed, getEventLogSizeBytes,
  } = deps;

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

    if (payload === 'offline' && driver.state !== 'disconnected') {
      // Ignore LWT offline messages during OTA updates - the ESP32 disconnects
      // from MQTT to receive firmware, but we don't want to mark it as disconnected
      if (driver.state === 'updating') {
        log.info(`Driver ${driverId} LWT offline ignored (OTA in progress)`);
        return;
      }

      log.warn(`Driver ${driverId} went offline (LWT triggered)`);
      driver.ip = undefined;
      driver.state = 'disconnected';

      sendToRenderer(getMainWindow, IPC.DRIVER_DISCONNECTED, driver);

      const status = systemMonitor.getSystemStatus(
        driverRegistry.getConnectedCount(),
        driverRegistry.getAllDrivers().length,
        getEventsProcessed(),
        getEventLogSizeBytes(),
      );
      sendToRenderer(getMainWindow, IPC.SYSTEM_STATUS, status);
    } else if (payload === 'online') {
      log.info(`Driver ${driverId} LWT status: online (waiting for connect message)`);
    }
  });
}
