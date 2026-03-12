import { powerSaveBlocker } from 'electron';
import type { AppServices, Logger } from './service-factory';
import type { WindowManager } from '../window/window-manager';
import type { SystemErrorTracker } from './system-error-tracker';
import type { EventStats } from './event-stats';
import { registerIpcHandlers } from '../ipc';
import { registerMqttSubscriptions } from '../mqtt-subscriptions';
import { setupDriverEventHandlers } from '../driver-callbacks';
import { createDriverConnectService } from './driver-connect-service';
import { installDefaultTransformers } from '../transformer-installer';
import { installDefaultInterceptors } from '../interceptor-installer';
import { installDefaultLedHardware } from '../led-hardware-installer';
import { installLaunchScript } from '../launch-script-installer';
import { eventBus } from './event-bus';
import { IPC } from '../config/ipc-channels';

export interface PowerSaveHandle {
  blockerId: number | null;
  stop(): void;
}

export interface ServiceStartupDeps {
  services: AppServices;
  windowManager: WindowManager;
  systemErrorTracker: SystemErrorTracker;
  eventStats: EventStats;
  hubVersion: string;
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
    windowManager.sendEventToRenderer(IPC.EVENT_RECEIVED, topic, message || undefined);
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

  void installLaunchScript().catch((error: unknown) => {
    log.error('Failed to install launch script:', error);
  });

  // Register status data sources so getFullStatus() works everywhere
  services.systemMonitor.registerStatusSources({
    getConnectedCount: () => services.driverRegistry.getConnectedCount(),
    getTotalCount: () => services.driverRegistry.getAllDrivers().length,
    getEventsProcessed: () => eventStats.getCount(),
    getEventLogSizeBytes: () => services.eventReader.getFileSizeBytes(),
    getErrors: () => systemErrorTracker.errors,
  });

  // Create driver connect service (handles config upload + logging sync)
  const driverConnectService = createDriverConnectService({
    driverConfig: services.driverConfig,
    mqtt: services.mqtt,
    uploadConfigToDriver: services.uploadConfigToDriver,
  });

  // Register driver event handlers (IPC routing + status updates)
  setupDriverEventHandlers({
    systemMonitor: services.systemMonitor,
    driverConnectService,
    getMainWindow: () => windowManager.getWindow(),
  });

  // Register IPC handlers
  registerIpcHandlers({
    driverRegistry: services.driverRegistry,
    driverConfig: services.driverConfig,
    driverLogPersistence: services.driverLogPersistence,
    logManager: services.logManager,
    ledHardwareManager: services.ledHardwareManager,
    mqtt: services.mqtt,
    systemMonitor: services.systemMonitor,
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

  // Check GitHub releases for newer hub version
  services.systemMonitor.startUpdateChecker(deps.hubVersion);

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
