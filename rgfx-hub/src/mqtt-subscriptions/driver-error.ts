/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';
import type { MqttBroker } from '../network';
import { getErrorMessage } from '../utils/driver-utils';
import { eventBus } from '../services/event-bus';

interface DriverErrorDeps {
  mqtt: MqttBroker;
}

interface DriverErrorPayload {
  driverId: string;
  source: string;
  error: string;
  payload: unknown;
}

export function subscribeDriverError(deps: DriverErrorDeps): void {
  const { mqtt } = deps;

  mqtt.subscribe('rgfx/system/driver/error', (_topic, message) => {
    try {
      const parsed = JSON.parse(message) as DriverErrorPayload;

      const errorMessage = `[${parsed.driverId}] ${parsed.source}: ${parsed.error}`;
      const isQueueOverflow = parsed.error.toLowerCase().includes('queue full');

      if (isQueueOverflow) {
        log.warn(`Driver warning: ${errorMessage}`);
      } else {
        log.error(`Driver error: ${errorMessage}`);
      }
      log.debug(`Driver error payload: ${JSON.stringify(parsed.payload)}`);

      eventBus.emit('system:error', {
        errorType: 'driver',
        message: errorMessage,
        timestamp: Date.now(),
        driverId: parsed.driverId,
        details: JSON.stringify(parsed.payload, null, 2),
      });
    } catch (err) {
      log.warn(`Failed to parse driver error message: ${getErrorMessage(err)}`);
    }
  });
}
