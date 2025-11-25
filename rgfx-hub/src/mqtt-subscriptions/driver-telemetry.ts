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

interface DriverTelemetryDeps {
  mqtt: MqttBroker;
  driverRegistry: DriverRegistry;
  getMainWindow: () => BrowserWindow | null;
}

export function subscribeDriverTelemetry(deps: DriverTelemetryDeps): void {
  const { mqtt, driverRegistry, getMainWindow } = deps;

  mqtt.subscribe('rgfx/system/driver/telemetry', (_topic, payload) => {
    const mqttReceiveTime = Date.now();
    log.info(`[DEBUG] Driver telemetry MQTT received at ${mqttReceiveTime}`);

    try {
      const parseResult = TelemetryPayloadSchema.safeParse(JSON.parse(payload));
      if (!parseResult.success) {
        log.error(`Invalid telemetry payload: ${parseResult.error.message}`);
        return;
      }
      const parsed = parseResult.data;
      const macAddress = parsed.mac;

      log.info(
        `[DEBUG] Telemetry parsed, calling registerDriver for ${macAddress} (elapsed: ${Date.now() - mqttReceiveTime}ms)`
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
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log.error(`Failed to parse driver telemetry message: ${errorMessage}`);
    }
  });
}
