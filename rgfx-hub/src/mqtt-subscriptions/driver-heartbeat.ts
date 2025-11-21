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
import type { DriverPersistence } from '../driver-persistence';
import type { DiscoveryService } from '../discovery-service';

interface DriverHeartbeatDeps {
  mqtt: Mqtt;
  driverRegistry: DriverRegistry;
  driverPersistence: DriverPersistence;
  discoveryService: DiscoveryService;
  getMainWindow: () => BrowserWindow | null;
}

export function subscribeDriverHeartbeat(deps: DriverHeartbeatDeps): void {
  const { mqtt, driverRegistry, driverPersistence, discoveryService, getMainWindow } = deps;

  mqtt.subscribe('rgfx/system/driver/heartbeat', (_topic, payload) => {
    try {
      const parsed = JSON.parse(payload) as {
        mac: string;
        freeHeap?: number;
        minFreeHeap?: number;
        rssi?: number;
        uptimeMs?: number;
        mqttMessagesReceived?: number;
        udpMessagesReceived?: number;
      };
      const macAddress = parsed.mac;

      if (!macAddress) {
        log.error("Heartbeat message missing 'mac' field");
        return;
      }

      const persistedDriver = driverPersistence.getDriverByMac(macAddress);
      const driverId = persistedDriver?.id ?? macAddress;

      // Extract telemetry if present
      const telemetry = {
        freeHeap: parsed.freeHeap,
        minFreeHeap: parsed.minFreeHeap,
        rssi: parsed.rssi,
        uptimeMs: parsed.uptimeMs,
        mqttMessagesReceived: parsed.mqttMessagesReceived,
        udpMessagesReceived: parsed.udpMessagesReceived,
      };

      const driver = driverRegistry.updateHeartbeat(driverId, telemetry);
      discoveryService.trackHeartbeatResponse(driverId);

      // Notify renderer of driver update
      if (driver) {
        const mainWindow = getMainWindow();
        if (mainWindow !== null && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('driver:updated', driver);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log.error(`Failed to parse driver heartbeat message: ${errorMessage}`);
    }
  });
}
