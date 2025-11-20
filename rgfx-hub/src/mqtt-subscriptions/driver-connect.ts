/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';
import type { Mqtt } from '../mqtt';
import type { DriverRegistry } from '../driver-registry';
import type { DriverSystemInfo } from '../types';

interface DriverConnectDeps {
  mqtt: Mqtt;
  driverRegistry: DriverRegistry;
}

export function subscribeDriverConnect(deps: DriverConnectDeps): void {
  const { mqtt, driverRegistry } = deps;

  mqtt.subscribe('rgfx/system/driver/connect', (_topic, payload) => {
    const mqttReceiveTime = Date.now();
    log.info(`[DEBUG] Driver connect MQTT received at ${mqttReceiveTime}`);

    try {
      const parsed = JSON.parse(payload) as unknown;
      const sysInfo = parsed as DriverSystemInfo;
      log.info(
        `[DEBUG] Driver connect parsed, calling registerDriver for ${sysInfo.mac} (elapsed: ${Date.now() - mqttReceiveTime}ms)`
      );
      driverRegistry.registerDriver(sysInfo);
      log.info(
        `[DEBUG] registerDriver completed for ${sysInfo.mac} (elapsed: ${Date.now() - mqttReceiveTime}ms)`
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      log.error(`Failed to parse driver connect message: ${errorMessage}`);
    }
  });
}
