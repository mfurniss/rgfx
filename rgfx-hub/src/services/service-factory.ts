/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

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
import { validateTransformerEffect } from '../transformer/validate-effect';
import { createUploadConfigToDriver } from '../upload-config-to-driver';
import { MQTT_DEFAULT_PORT } from '../config/constants';
import type { AmbilightGradient } from '../types/transformer-types';

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
 * Build HTTP context methods for the transformer engine.
 * Provides GET, POST, PUT, DELETE with proper JSON handling.
 */
function createHttpContext() {
  const mergeHeaders = (
    baseHeaders: Headers,
    options?: RequestInit,
  ): Headers => {
    if (options?.headers) {
      const extraHeaders =
        options.headers instanceof Headers
          ? options.headers
          : new Headers(options.headers);

      extraHeaders.forEach((value, key) => {
        baseHeaders.set(key, value);
      });
    }
    return baseHeaders;
  };

  return {
    get: (url: string, options?: RequestInit) =>
      fetch(url, { ...options, method: 'GET' }),

    post: (url: string, body: unknown, options?: RequestInit) => {
      const headers = mergeHeaders(
        new Headers({ 'Content-Type': 'application/json' }),
        options,
      );
      return fetch(url, {
        ...options,
        method: 'POST',
        body: JSON.stringify(body),
        headers,
      });
    },

    put: (url: string, body: unknown, options?: RequestInit) => {
      const headers = mergeHeaders(
        new Headers({ 'Content-Type': 'application/json' }),
        options,
      );
      return fetch(url, {
        ...options,
        method: 'PUT',
        body: JSON.stringify(body),
        headers,
      });
    },

    delete: (url: string, options?: RequestInit) =>
      fetch(url, { ...options, method: 'DELETE' }),
  };
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
 * Parse ambilight payload (12-bit colors) to background effect gradient props.
 * Converts compact 12-bit hex colors (e.g., "F00,0F0,00F") to full 24-bit colors.
 *
 * @param payload Comma-separated 12-bit hex colors
 * @param orientation Gradient orientation ('horizontal' or 'vertical')
 * @returns Gradient object for background effect props
 */
function parseAmbilight(
  payload: string,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
): AmbilightGradient {
  const colors = payload.split(',').map((c) => {
    // Expand 12-bit to 24-bit: F0A -> #FF00AA
    const r = c[0] || '0';
    const g = c[1] || '0';
    const b = c[2] || '0';
    return `#${r}${r}${g}${g}${b}${b}`;
  });

  return { colors, orientation };
}

/**
 * Convert HSL color to hex string.
 *
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 * @returns Hex color string (e.g., "#FF77A8")
 */
function hslToHex(h: number, s: number, l: number): string {
  // Normalize inputs
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const lit = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * lit - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lit - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
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

  // Initialize transformer engine with all context services
  const transformerEngine = new TransformerEngine({
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
    parseAmbilight,
    hslToHex,
  });

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
