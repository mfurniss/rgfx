/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';
import type { MqttBroker } from '../network';
import type { SystemError } from '../types';
import { getErrorMessage } from '../utils/driver-utils';

interface DriverErrorDeps {
  mqtt: MqttBroker;
  addSystemError: (error: SystemError) => void;
}

interface DriverErrorPayload {
  driverId: string;
  effect: string;
  error: string;
  payload: unknown;
}

export function subscribeDriverError(deps: DriverErrorDeps): void {
  const { mqtt, addSystemError } = deps;

  mqtt.subscribe('rgfx/system/driver/error', (_topic, message) => {
    try {
      const parsed = JSON.parse(message) as DriverErrorPayload;

      const errorMessage = `[${parsed.driverId}] Effect '${parsed.effect}' error: ${parsed.error}`;
      log.error(`Driver error: ${errorMessage}`);
      log.debug(`Driver error payload: ${JSON.stringify(parsed.payload)}`);

      addSystemError({
        errorType: 'driver',
        message: errorMessage,
        timestamp: Date.now(),
        driverId: parsed.driverId,
        details: JSON.stringify(parsed.payload, null, 2),
      });
    } catch (err) {
      log.error(`Failed to parse driver error message: ${getErrorMessage(err)}`);
    }
  });
}
