/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { merge } from 'lodash-es';
import { Driver } from '../../types';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

const defaultDriverData = {
  id: 'rgfx-driver-0001',
  mac: 'AA:BB:CC:DD:EE:FF',
  ip: '192.168.1.100',
  hostname: 'test-host',
  ssid: 'TestNetwork',
  rssi: -50,
  state: 'connected' as const,
  lastSeen: Date.now(),
  failedHeartbeats: 0,
  testActive: false,
  disabled: false,
  stats: {
    telemetryEventsReceived: 1,
    mqttMessagesReceived: 1,
    mqttMessagesFailed: 0,
    udpMessagesSent: 0,
    udpMessagesFailed: 0,
  },
  telemetry: {
    chipModel: 'ESP32',
    chipRevision: 1,
    chipCores: 2,
    cpuFreqMHz: 240,
    flashSize: 4194304,
    flashSpeed: 40000000,
    heapSize: 327680,
    psramSize: 0,
    freePsram: 0,
    hasDisplay: false,
    sdkVersion: 'v4.4',
    sketchSize: 1000000,
    freeSketchSpace: 2000000,
    currentFps: 120.0,
    minFps: 118.0,
    maxFps: 122.0,
  },
};

/**
 * Factory function to create mock Driver instances for testing.
 * Supports deep partial overrides - only specify the fields you want to change.
 *
 * @example
 * // Default driver
 * const driver = createMockDriver()
 *
 * // Override top-level property
 * const disconnected = createMockDriver({ state: 'disconnected' })
 *
 * // Deep override (only currentFps changes, rest of telemetry preserved)
 * const slowDriver = createMockDriver({ telemetry: { currentFps: 60 } })
 */
type DriverConstructorParams = ConstructorParameters<typeof Driver>[0];

export function createMockDriver(
  overrides?: DeepPartial<DriverConstructorParams>,
): Driver {
  const mergedData = merge({}, defaultDriverData, overrides);
  return new Driver(mergedData);
}
