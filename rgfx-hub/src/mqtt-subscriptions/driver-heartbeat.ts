/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

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
}

export function subscribeDriverHeartbeat(deps: DriverHeartbeatDeps): void {
  const { mqtt, driverRegistry, driverPersistence, discoveryService } = deps;

  mqtt.subscribe('rgfx/system/driver/heartbeat', (_topic, payload) => {
    try {
      const parsed = JSON.parse(payload) as { mac: string };
      const macAddress = parsed.mac;

      if (!macAddress) {
        log.error("Heartbeat message missing 'mac' field");
        return;
      }

      const persistedDriver = driverPersistence.getDriverByMac(macAddress);
      const driverId = persistedDriver?.id ?? macAddress;

      driverRegistry.updateHeartbeat(driverId);
      discoveryService.trackHeartbeatResponse(driverId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log.error(`Failed to parse driver heartbeat message: ${errorMessage}`);
    }
  });
}
