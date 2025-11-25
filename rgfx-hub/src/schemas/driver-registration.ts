/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { TelemetryPayloadSchema } from './telemetry-payload';
import { DriverTelemetrySchema } from './driver-telemetry';

/**
 * Driver registration data - fields passed to registerDriver()
 * Combines network info, runtime metrics, and statistics with telemetry
 */
export const DriverRegistrationSchema = TelemetryPayloadSchema.pick({
  ip: true,
  mac: true,
  hostname: true,
  ssid: true,
  rssi: true,
  freeHeap: true,
  minFreeHeap: true,
  uptimeMs: true,
  testActive: true,
  mqttMessagesReceived: true,
  udpMessagesReceived: true,
}).extend({
  telemetry: DriverTelemetrySchema,
});

export type DriverRegistration = z.infer<typeof DriverRegistrationSchema>;
