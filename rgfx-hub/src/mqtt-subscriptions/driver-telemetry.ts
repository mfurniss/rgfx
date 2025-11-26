/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { BrowserWindow } from 'electron';
import log from 'electron-log/main';
import type { MqttBroker } from '../mqtt';
import type { DriverRegistry } from '../driver-registry';
import { serializeDriverForIPC } from '../types';
import {
  TelemetryPayloadSchema,
  DriverTelemetrySchema,
  DriverRegistrationSchema,
} from '../schemas';
import {
  MinimalDriverRegistrationSchema,
  type MinimalDriverRegistration,
} from '../schemas/minimal-driver-registration';

interface DriverTelemetryDeps {
  mqtt: MqttBroker;
  driverRegistry: DriverRegistry;
  getMainWindow: () => BrowserWindow | null;
}

/**
 * Create minimal driver registration from incomplete telemetry data.
 * Used for backward compatibility with old firmware that doesn't send complete telemetry.
 *
 * Populates missing fields with placeholder values to allow driver registration
 * and enable OTA updates even when telemetry is incomplete.
 */
function createMinimalRegistration(minimal: MinimalDriverRegistration) {
  // Build telemetry with placeholders for missing fields
  const telemetryData = DriverTelemetrySchema.parse({
    chipModel: minimal.chipModel ?? 'ESP32',
    chipRevision: minimal.chipRevision ?? 0,
    chipCores: minimal.chipCores ?? 2,
    cpuFreqMHz: minimal.cpuFreqMHz ?? 240,
    flashSize: minimal.flashSize ?? 4194304,
    flashSpeed: minimal.flashSpeed ?? 40000000,
    heapSize: minimal.heapSize ?? 327680,
    psramSize: minimal.psramSize ?? 0,
    freePsram: minimal.freePsram ?? 0,
    hasDisplay: minimal.hasDisplay ?? false,
    firmwareVersion: minimal.firmwareVersion, // Keep undefined if missing
    sdkVersion: minimal.sdkVersion ?? 'unknown',
    sketchSize: minimal.sketchSize ?? 0,
    freeSketchSpace: minimal.freeSketchSpace ?? 0,
  });

  // Build and validate complete registration data
  return DriverRegistrationSchema.parse({
    ip: minimal.ip,
    mac: minimal.mac,
    hostname: minimal.hostname ?? 'unknown',
    ssid: minimal.ssid ?? 'unknown',
    rssi: minimal.rssi ?? -100,
    freeHeap: minimal.freeHeap ?? 0,
    minFreeHeap: minimal.minFreeHeap ?? 0,
    uptimeMs: minimal.uptimeMs ?? 0,
    telemetry: telemetryData,
    testActive: minimal.testActive,
    mqttMessagesReceived: minimal.mqttMessagesReceived,
    udpMessagesReceived: minimal.udpMessagesReceived,
  });
}

export function subscribeDriverTelemetry(deps: DriverTelemetryDeps): void {
  const { mqtt, driverRegistry, getMainWindow } = deps;

  mqtt.subscribe('rgfx/system/driver/telemetry', (_topic, payload) => {
    const mqttReceiveTime = Date.now();
    log.info(`[DEBUG] Driver telemetry MQTT received at ${mqttReceiveTime}`);

    try {
      const parsedPayload: unknown = JSON.parse(payload);

      // Try full validation first (current firmware)
      const fullParseResult = TelemetryPayloadSchema.safeParse(parsedPayload);

      if (fullParseResult.success) {
        // Modern firmware with complete telemetry
        const parsed = fullParseResult.data;
        const macAddress = parsed.mac;

        log.info(
          `[DEBUG] Full telemetry validated, calling registerDriver for ${macAddress} (elapsed: ${Date.now() - mqttReceiveTime}ms)`
        );

        // Extract registration data using Zod schemas
        const telemetry = DriverTelemetrySchema.parse(parsed);
        const registrationData = DriverRegistrationSchema.parse({ ...parsed, telemetry });

        // Register or update driver
        const driver = driverRegistry.registerDriver(registrationData);

        log.info(
          `[DEBUG] registerDriver completed for ${macAddress} (elapsed: ${Date.now() - mqttReceiveTime}ms)`
        );

        // Notify renderer of driver update
        const mainWindow = getMainWindow();
        log.info(`[DEBUG] Sending driver:updated to renderer for ${driver.id}`);
        if (mainWindow !== null && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('driver:updated', serializeDriverForIPC(driver));
          log.info(`[DEBUG] driver:updated sent successfully for ${driver.id}`);
        } else {
          log.warn(`[DEBUG] Cannot send driver:updated - mainWindow unavailable`);
        }
      } else {
        // Try minimal validation (old firmware fallback)
        const minimalParseResult = MinimalDriverRegistrationSchema.safeParse(parsedPayload);

        if (minimalParseResult.success) {
          const minimalData = minimalParseResult.data;
          log.warn(
            `Registering driver with minimal telemetry (old firmware): ${minimalData.mac} at ${minimalData.ip}`
          );

          // Create minimal driver registration with placeholder telemetry
          const registrationData = createMinimalRegistration(minimalData);
          const driver = driverRegistry.registerDriver(registrationData);

          log.info(
            `[DEBUG] Minimal registration completed for ${minimalData.mac} (elapsed: ${Date.now() - mqttReceiveTime}ms)`
          );

          // Notify renderer of driver update (UI will show "Update Required" badge)
          const mainWindow = getMainWindow();
          if (mainWindow !== null && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('driver:updated', serializeDriverForIPC(driver));
            log.info(`[DEBUG] driver:updated sent successfully for ${driver.id} (minimal)`);
          } else {
            log.warn(`[DEBUG] Cannot send driver:updated - mainWindow unavailable`);
          }
        } else {
          // Completely invalid - reject
          log.error(
            `Invalid telemetry payload (failed both full and minimal validation): ${JSON.stringify({
              fullErrors: fullParseResult.error.issues.slice(0, 5), // Limit to first 5 errors
              minimalErrors: minimalParseResult.error.issues,
            })}`
          );
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log.error(`Failed to parse driver telemetry message: ${errorMessage}`);
    }
  });
}
