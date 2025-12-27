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
import type { MqttBroker } from './network';
import { serializeDriverForIPC, type SystemError } from './types';
import { eventBus } from './services/event-bus';

interface DriverEventHandlersDeps {
  driverRegistry: DriverRegistry;
  driverPersistence: DriverPersistence;
  systemMonitor: SystemMonitor;
  mqtt: MqttBroker;
  getMainWindow: () => BrowserWindow | null;
  getEventsProcessed: () => number;
  getSystemErrors: () => SystemError[];
  uploadConfigToDriver: (macAddress: string) => Promise<boolean>;
}

/**
 * Sets up event handlers for driver lifecycle events.
 * Subscribes to the event bus and handles IPC communication to renderer.
 */
export function setupDriverEventHandlers(deps: DriverEventHandlersDeps): void {
  const {
    driverRegistry,
    driverPersistence,
    systemMonitor,
    mqtt,
    getMainWindow,
    getEventsProcessed,
    getSystemErrors,
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
      driverRegistry.getAllDrivers().length,
      getEventsProcessed(),
      getSystemErrors(),
    );
    mainWindow.webContents.send('system:status', status);
  }

  // Handle driver connected events
  eventBus.on('driver:connected', ({ driver }) => {
    const eventTime = Date.now();
    log.info(`[DEBUG] driver:connected event received for ${driver.id} at ${eventTime}`);

    const mainWindow = getMainWindow();

    if (isWindowAvailable() && mainWindow) {
      mainWindow.webContents.send('driver:connected', serializeDriverForIPC(driver));
      log.info(
        `[DEBUG] IPC driver:connected sent to renderer for ${driver.id} (elapsed: ${Date.now() - eventTime}ms)`,
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

  // Handle driver disconnected events
  eventBus.on('driver:disconnected', ({ driver, reason }) => {
    const mainWindow = getMainWindow();

    if (isWindowAvailable() && mainWindow) {
      mainWindow.webContents.send('driver:disconnected', serializeDriverForIPC(driver), reason);
      log.info(`Sent driver:disconnected event to renderer (reason: ${reason})`);
      sendSystemStatus();
    }
  });

  // Handle driver updated events (stats changes, telemetry updates)
  eventBus.on('driver:updated', ({ driver }) => {
    const mainWindow = getMainWindow();

    if (isWindowAvailable() && mainWindow) {
      mainWindow.webContents.send('driver:updated', serializeDriverForIPC(driver));
    }
  });

  // Handle driver restarting events (config save, expected reboot)
  eventBus.on('driver:restarting', ({ driver }) => {
    const mainWindow = getMainWindow();

    if (isWindowAvailable() && mainWindow) {
      mainWindow.webContents.send('driver:restarting', serializeDriverForIPC(driver));
      log.info(`Sent driver:restarting event to renderer for ${driver.id}`);
      sendSystemStatus();
    }
  });

  // Handle OTA flash events
  eventBus.on('flash:ota:state', (data) => {
    const mainWindow = getMainWindow();

    if (isWindowAvailable() && mainWindow) {
      mainWindow.webContents.send('flash:ota:state', data);
    }
  });

  eventBus.on('flash:ota:progress', (data) => {
    const mainWindow = getMainWindow();

    if (isWindowAvailable() && mainWindow) {
      mainWindow.webContents.send('flash:ota:progress', data);
    }
  });

  eventBus.on('flash:ota:error', (data) => {
    const mainWindow = getMainWindow();

    if (isWindowAvailable() && mainWindow) {
      mainWindow.webContents.send('flash:ota:error', data);
    }
  });
}
