/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { BrowserWindow } from 'electron';
import log from 'electron-log/main';
import type { Mqtt } from '../mqtt';
import type { DriverRegistry } from '../driver-registry';
import type { DriverTelemetry } from '../types';
import { serializeDriverForIPC } from '../types';

interface DriverTelemetryDeps {
  mqtt: Mqtt;
  driverRegistry: DriverRegistry;
  getMainWindow: () => BrowserWindow | null;
}

/**
 * Telemetry payload sent by drivers
 * Serves as both initial connection message and periodic heartbeat
 */
interface TelemetryPayload {
  // Network information
  ip: string;
  mac: string;
  hostname: string;
  ssid: string;
  // Runtime metrics
  rssi: number;
  freeHeap: number;
  minFreeHeap: number;
  uptimeMs: number;
  // Hardware/firmware telemetry
  chipModel: string;
  chipRevision: number;
  chipCores: number;
  cpuFreqMHz: number;
  flashSize: number;
  flashSpeed: number;
  heapSize: number;
  psramSize: number;
  freePsram: number;
  hasDisplay: boolean;
  firmwareVersion?: string;
  sdkVersion: string;
  sketchSize: number;
  freeSketchSpace: number;
  // Runtime state
  testActive?: boolean;
  // Statistics
  mqttMessagesReceived?: number;
  udpMessagesReceived?: number;
}

export function subscribeDriverTelemetry(deps: DriverTelemetryDeps): void {
  const { mqtt, driverRegistry, getMainWindow } = deps;

  mqtt.subscribe('rgfx/system/driver/telemetry', (_topic, payload) => {
    const mqttReceiveTime = Date.now();
    log.info(`[DEBUG] Driver telemetry MQTT received at ${mqttReceiveTime}`);

    try {
      const parsed = JSON.parse(payload) as TelemetryPayload;
      const macAddress = parsed.mac;

      if (!macAddress) {
        log.error("Telemetry message missing 'mac' field");
        return;
      }

      log.info(
        `[DEBUG] Telemetry parsed, calling registerDriver for ${macAddress} (elapsed: ${Date.now() - mqttReceiveTime}ms)`
      );

      // Extract hardware/firmware telemetry
      const telemetry: DriverTelemetry = {
        chipModel: parsed.chipModel,
        chipRevision: parsed.chipRevision,
        chipCores: parsed.chipCores,
        cpuFreqMHz: parsed.cpuFreqMHz,
        flashSize: parsed.flashSize,
        flashSpeed: parsed.flashSpeed,
        heapSize: parsed.heapSize,
        psramSize: parsed.psramSize,
        freePsram: parsed.freePsram,
        hasDisplay: parsed.hasDisplay,
        firmwareVersion: parsed.firmwareVersion,
        sdkVersion: parsed.sdkVersion,
        sketchSize: parsed.sketchSize,
        freeSketchSpace: parsed.freeSketchSpace,
      };

      // Register or update driver with full telemetry data
      const driver = driverRegistry.registerDriver({
        ip: parsed.ip,
        mac: parsed.mac,
        hostname: parsed.hostname,
        ssid: parsed.ssid,
        rssi: parsed.rssi,
        freeHeap: parsed.freeHeap,
        minFreeHeap: parsed.minFreeHeap,
        uptimeMs: parsed.uptimeMs,
        telemetry: telemetry,
        testActive: parsed.testActive,
        mqttMessagesReceived: parsed.mqttMessagesReceived,
        udpMessagesReceived: parsed.udpMessagesReceived,
      });

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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log.error(`Failed to parse driver telemetry message: ${errorMessage}`);
    }
  });
}
