import path from 'node:path';
import type { ElectronLogger } from '../config/logging';
import { MqttBroker, NetworkManager } from '../network';
import { EventFileReader } from '../event-file-reader';
import { DriverRegistry } from '../driver-registry';
import { SystemMonitor } from '../system-monitor';
import { DriverConfig } from '../driver-config';
import { DriverLogPersistence } from '../driver-log-persistence';
import { LogManager } from '../log-manager';
import { LEDHardwareManager } from '../led-hardware-manager';
import { TransformerEngine } from '../transformer-engine';
import { UdpClientImpl } from '../transformer/udp-client';
import { MqttClientWrapper } from '../transformer/mqtt-client-wrapper';
import { StateStoreImpl } from '../transformer/state-store';
import { LoggerWrapper } from '../transformer/logger-wrapper';
import { getTransformersDir } from '../transformer-installer';
import { loadGif } from '../gif-loader';
import { loadSprite } from '../sprite-loader';
import { validateTransformerEffect } from '../transformer/validate-effect';
import { createUploadConfigToDriver } from '../upload-config-to-driver';
import { createTransformerUtils } from '../transformer-utils';
import { MQTT_DEFAULT_PORT } from '../config/constants';
import { parseAmbilight, hslToHex } from '../utils/color-utils';
import { createHttpContext } from '../utils/http-context';

export type Logger = ElectronLogger;

export interface AppServices {
  driverConfig: DriverConfig;
  driverLogPersistence: DriverLogPersistence;
  logManager: LogManager;
  ledHardwareManager: LEDHardwareManager;
  mqtt: MqttBroker;
  eventReader: EventFileReader;
  driverRegistry: DriverRegistry;
  systemMonitor: SystemMonitor;
  transformerEngine: TransformerEngine;
  networkManager: NetworkManager;
  udpClient: UdpClientImpl;
  uploadConfigToDriver: (macAddress: string) => Promise<boolean>;
}

/**
 * Create GIF loader that resolves relative paths from transformers directory.
 */
function createGifLoader() {
  return (gifPath: string) => {
    const resolvedPath = path.isAbsolute(gifPath)
      ? gifPath
      : path.resolve(getTransformersDir(), gifPath);
    return loadGif(resolvedPath);
  };
}

/**
 * Create sprite loader that resolves relative paths from transformers directory.
 */
function createSpriteLoader() {
  return (spritePath: string) => {
    const resolvedPath = path.isAbsolute(spritePath)
      ? spritePath
      : path.resolve(getTransformersDir(), spritePath);
    return loadSprite(resolvedPath);
  };
}

/**
 * Creates all application services and wires them together.
 *
 * @param configPath Path to the RGFX config directory
 * @param logger Electron log instance
 * @returns All initialized services
 */
export function createServices(
  configPath: string,
  logger: Logger,
): AppServices {
  // Initialize persistence services first
  const driverConfig = new DriverConfig(configPath);
  const driverLogPersistence = new DriverLogPersistence(configPath);
  const logManager = new LogManager(configPath, driverLogPersistence);
  const ledHardwareManager = new LEDHardwareManager(configPath);

  // Load driver config BEFORE creating registry so drivers are available
  // (throws ConfigError on parse failure - caught in main.ts)
  driverConfig.loadConfig();

  // Core services
  const mqtt = new MqttBroker(MQTT_DEFAULT_PORT);
  const eventReader = new EventFileReader();
  const driverRegistry = new DriverRegistry(driverConfig, ledHardwareManager);
  const systemMonitor = new SystemMonitor(mqtt);

  // Create uploadConfigToDriver function
  const uploadConfigToDriver = createUploadConfigToDriver({
    driverConfig,
    ledHardwareManager,
    mqtt,
  });

  // Transformer engine context services
  const udpClient = new UdpClientImpl(driverRegistry, systemMonitor);
  const mqttClient = new MqttClientWrapper(mqtt);
  const stateStore = new StateStoreImpl();
  const loggerWrapper = new LoggerWrapper(logger);
  const { utils, clearAllTimers } = createTransformerUtils();

  // Initialize transformer engine with all context services
  const transformerEngine = new TransformerEngine(
    {
      broadcast: (payload) => {
        const validated = validateTransformerEffect(payload, loggerWrapper);
        return udpClient.broadcast(validated);
      },
      udp: udpClient,
      mqtt: mqttClient,
      http: createHttpContext(),
      state: stateStore,
      log: loggerWrapper,
      drivers: driverRegistry,
      loadGif: createGifLoader(),
      loadSprite: createSpriteLoader(),
      parseAmbilight,
      hslToHex,
      utils,
    },
    { clearAllTimers },
  );

  // Network manager to handle network changes (emits network:changed events)
  const networkManager = new NetworkManager(mqtt);

  return {
    driverConfig,
    driverLogPersistence,
    logManager,
    ledHardwareManager,
    mqtt,
    eventReader,
    driverRegistry,
    systemMonitor,
    transformerEngine,
    networkManager,
    udpClient,
    uploadConfigToDriver,
  };
}
