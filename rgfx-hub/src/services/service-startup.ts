/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { powerSaveBlocker } from 'electron';
import type { AppServices, Logger } from './service-factory';
import type { WindowManager } from '../window/window-manager';
import type { SystemErrorTracker } from './system-error-tracker';
import type { EventStats } from './event-stats';
import { registerIpcHandlers } from '../ipc';
import { registerMqttSubscriptions } from '../mqtt-subscriptions';
import { setupDriverEventHandlers } from '../driver-callbacks';
import { installDefaultTransformers } from '../transformer-installer';
import { installDefaultInterceptors } from '../interceptor-installer';
import { installDefaultLedHardware } from '../led-hardware-installer';
import { eventBus } from './event-bus';

export interface PowerSaveHandle {
  blockerId: number | null;
  stop(): void;
}

export interface ServiceStartupDeps {
  services: AppServices;
  windowManager: WindowManager;
  systemErrorTracker: SystemErrorTracker;
  eventStats: EventStats;
  log: Logger;
}

/**
 * Process an incoming event from the event file reader.
 */
function createEventProcessor(
  services: AppServices,
  windowManager: WindowManager,
  eventStats: EventStats,
  log: typeof import('electron-log/main').default,
) {
  return (topic: string, message: string): void => {
    // Check for interceptor error events
    if (topic === 'rgfx/interceptor/error') {
      log.error(`Interceptor error: ${message}`);
      eventBus.emit('system:error', { errorType: 'interceptor', message, timestamp: Date.now() });
    }

    void services.transformerEngine.handleEvent(topic, message);

    // Update event count and notify renderer
    eventStats.increment();
    windowManager.sendEventToRenderer('event:received', topic, message || undefined);
  };
}

/**
 * Starts all application services when there are no critical errors.
 * This includes MQTT broker, driver monitoring, event processing, and more.
 *
 * @returns PowerSaveHandle to stop the power save blocker on shutdown
 */
export function startServices(deps: ServiceStartupDeps): PowerSaveHandle {
  const { services, windowManager, systemErrorTracker, eventStats, log } = deps;

  // Prevent macOS App Nap from suspending background network services
  const blockerId = powerSaveBlocker.start('prevent-app-suspension');
  log.info(`Power save blocker started (id: ${blockerId})`);

  // Start MQTT broker
  services.mqtt.start();

  // Start connection timeout monitor (checks for drivers that stop responding)
  services.driverRegistry.startConnectionMonitor();

  // Install default transformers and interceptors to user config directory (async)
  void installDefaultTransformers()
    .then(() => {
      // Load transformer engine handlers after installing defaults
      void services.transformerEngine.loadTransformers();
    })
    .catch((error: unknown) => {
      log.error('Failed to install default transformers:', error);
    });

  void installDefaultInterceptors().catch((error: unknown) => {
    log.error('Failed to install default interceptors:', error);
  });

  void installDefaultLedHardware().catch((error: unknown) => {
    log.error('Failed to install LED hardware definitions:', error);
  });

  // Register driver event handlers
  setupDriverEventHandlers({
    driverRegistry: services.driverRegistry,
    driverConfig: services.driverConfig,
    systemMonitor: services.systemMonitor,
    mqtt: services.mqtt,
    getMainWindow: () => windowManager.getWindow(),
    getEventsProcessed: () => eventStats.getCount(),
    getEventLogSizeBytes: () => services.eventReader.getFileSizeBytes(),
    getSystemErrors: () => systemErrorTracker.errors,
    uploadConfigToDriver: services.uploadConfigToDriver,
  });

  // Register IPC handlers
  registerIpcHandlers({
    driverRegistry: services.driverRegistry,
    driverConfig: services.driverConfig,
    driverLogPersistence: services.driverLogPersistence,
    ledHardwareManager: services.ledHardwareManager,
    mqtt: services.mqtt,
    uploadConfigToDriver: services.uploadConfigToDriver,
    udpClient: services.udpClient,
    transformerEngine: services.transformerEngine,
    onEventProcessed: createEventProcessor(services, windowManager, eventStats, log),
    resetEventsProcessed: () => {
      eventStats.reset();
    },
    getMainWindow: () => {
      const window = windowManager.getWindow();

      if (!window) {
        throw new Error('Main window not initialized');
      }
      return window;
    },
  });

  // Register MQTT subscriptions
  registerMqttSubscriptions({
    mqtt: services.mqtt,
    driverRegistry: services.driverRegistry,
    driverConfig: services.driverConfig,
    systemMonitor: services.systemMonitor,
    driverLogPersistence: services.driverLogPersistence,
    getMainWindow: () => windowManager.getWindow(),
    getEventsProcessed: () => eventStats.getCount(),
    getEventLogSizeBytes: () => services.eventReader.getFileSizeBytes(),
  });

  // Start reading events and send to transformer engine for processing
  services.eventReader.start(
    createEventProcessor(services, windowManager, eventStats, log),
    (errorMessage) => {
      eventBus.emit('system:error', {
        errorType: 'interceptor',
        message: errorMessage,
        timestamp: Date.now(),
      });
    },
  );

  // Start firmware monitoring
  services.systemMonitor.startFirmwareMonitoring((_version: string | null) => {
    log.info('[main] Firmware version updated, broadcasting new system status');
    windowManager.sendSystemStatus();
  });

  return {
    blockerId,
    stop(): void {
      if (powerSaveBlocker.isStarted(blockerId)) {
        powerSaveBlocker.stop(blockerId);
        log.info('Power save blocker stopped');
      }
    },
  };
}
