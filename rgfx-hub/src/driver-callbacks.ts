/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { BrowserWindow } from 'electron';
import log from 'electron-log/main';
import type { DriverRegistry } from './driver-registry';
import type { DriverPersistence } from './driver-persistence';
import type { SystemMonitor } from './system-monitor';
import type { MqttBroker } from './mqtt';
import { serializeDriverForIPC } from './types';

interface DriverCallbacksDeps {
  driverRegistry: DriverRegistry;
  driverPersistence: DriverPersistence;
  systemMonitor: SystemMonitor;
  mqtt: MqttBroker;
  getMainWindow: () => BrowserWindow | null;
  getEventsProcessed: () => number;
  uploadConfigToDriver: (macAddress: string) => Promise<void>;
}

export function registerDriverCallbacks(deps: DriverCallbacksDeps): void {
  const {
    driverRegistry,
    driverPersistence,
    systemMonitor,
    mqtt,
    getMainWindow,
    getEventsProcessed,
    uploadConfigToDriver,
  } = deps;

  function isWindowAvailable(): boolean {
    const mainWindow = getMainWindow();
    return mainWindow !== null && !mainWindow.isDestroyed();
  }

  function sendSystemStatus() {
    const mainWindow = getMainWindow();

    if (!isWindowAvailable() || !mainWindow) {
      return;
    }
    const status = systemMonitor.getSystemStatus(
      driverRegistry.getConnectedCount(),
      getEventsProcessed(),
    );
    mainWindow.webContents.send('system:status', status);
  }

  driverRegistry.onDriverConnected((driver) => {
    const callbackTime = Date.now();
    log.info(`[DEBUG] onDriverConnected callback triggered for ${driver.id} at ${callbackTime}`);

    const mainWindow = getMainWindow();

    if (isWindowAvailable() && mainWindow) {
      mainWindow.webContents.send('driver:connected', serializeDriverForIPC(driver));
      log.info(
        `[DEBUG] IPC driver:connected sent to renderer for ${driver.id} (elapsed: ${Date.now() - callbackTime}ms)`,
      );
      sendSystemStatus();
    }

    if (driver.mac) {
      void uploadConfigToDriver(driver.mac).catch((error: unknown) => {
        log.error(`Failed to upload config to driver ${driver.id}:`, error);
      });

      // Send remote logging configuration to driver
      const persistedDriver = driverPersistence.getDriver(driver.id);
      const remoteLogging = persistedDriver?.remoteLogging ?? 'off';
      const loggingTopic = `rgfx/driver/${driver.mac}/logging`;
      const loggingPayload = JSON.stringify({ level: remoteLogging });

      void mqtt.publish(loggingTopic, loggingPayload).then(() => {
        log.info(`Sent remote logging config to driver ${driver.id}: ${remoteLogging}`);
      }).catch((error: unknown) => {
        log.error(`Failed to send logging config to driver ${driver.id}:`, error);
      });
    } else {
      log.warn(`Driver ${driver.id} connected without MAC address - cannot upload config`);
    }
  });

  driverRegistry.onDriverDisconnected((driver) => {
    const mainWindow = getMainWindow();

    if (isWindowAvailable() && mainWindow) {
      mainWindow.webContents.send('driver:disconnected', serializeDriverForIPC(driver));
      log.info('Sent driver:disconnected event to renderer');
      sendSystemStatus();
    }
  });
}
