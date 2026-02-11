/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { BrowserWindow } from 'electron';
import log from 'electron-log/main';
import type { DriverRegistry } from './driver-registry';
import type { DriverConfig } from './driver-config';
import type { SystemMonitor } from './system-monitor';
import type { MqttBroker } from './network';
import type { SystemError } from './types';
import { sendToRenderer } from './utils/driver-utils';
import { eventBus } from './services/event-bus';
import { IPC } from './config/ipc-channels';

interface DriverEventHandlersDeps {
  driverRegistry: DriverRegistry;
  driverConfig: DriverConfig;
  systemMonitor: SystemMonitor;
  mqtt: MqttBroker;
  getMainWindow: () => BrowserWindow | null;
  getEventsProcessed: () => number;
  getEventLogSizeBytes: () => number;
  getSystemErrors: () => readonly SystemError[];
  uploadConfigToDriver: (macAddress: string) => Promise<boolean>;
}

/**
 * Sets up event handlers for driver lifecycle events.
 * Subscribes to the event bus and handles IPC communication to renderer.
 */
export function setupDriverEventHandlers(deps: DriverEventHandlersDeps): void {
  const {
    driverRegistry,
    driverConfig,
    systemMonitor,
    mqtt,
    getMainWindow,
    getEventsProcessed,
    getEventLogSizeBytes,
    getSystemErrors,
    uploadConfigToDriver,
  } = deps;

  function sendSystemStatus() {
    const status = systemMonitor.getSystemStatus(
      driverRegistry.getConnectedCount(),
      driverRegistry.getAllDrivers().length,
      getEventsProcessed(),
      getEventLogSizeBytes(),
      getSystemErrors(),
    );
    sendToRenderer(getMainWindow, IPC.SYSTEM_STATUS, status);
  }

  eventBus.on('driver:connected', ({ driver }) => {
    sendToRenderer(getMainWindow, IPC.DRIVER_CONNECTED, driver);
    sendSystemStatus();

    if (driver.mac) {
      void uploadConfigToDriver(driver.mac).catch((error: unknown) => {
        log.error(`Failed to upload config to driver ${driver.id}:`, error);
      });

      // Send remote logging configuration to driver
      const configuredDriver = driverConfig.getDriver(driver.id);
      const remoteLogging = configuredDriver?.remoteLogging ?? 'off';
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

  eventBus.on('driver:disconnected', ({ driver, reason }) => {
    sendToRenderer(getMainWindow, IPC.DRIVER_DISCONNECTED, driver, reason);
    log.info(`Sent driver:disconnected event to renderer (reason: ${reason})`);
    sendSystemStatus();
  });

  eventBus.on('driver:updated', ({ driver }) => {
    sendToRenderer(getMainWindow, IPC.DRIVER_UPDATED, driver);
  });

  eventBus.on('driver:restarting', ({ driver }) => {
    sendToRenderer(getMainWindow, IPC.DRIVER_RESTARTING, driver);
    log.info(`Sent driver:restarting event to renderer for ${driver.id}`);
    sendSystemStatus();
  });

  for (const event of [IPC.FLASH_OTA_STATE, IPC.FLASH_OTA_PROGRESS, IPC.FLASH_OTA_ERROR] as const) {
    eventBus.on(event, (data) => {
      sendToRenderer(getMainWindow, event, data);
    });
  }
}
