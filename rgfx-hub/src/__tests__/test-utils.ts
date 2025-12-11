/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { writeFileSync, existsSync } from 'node:fs';
import {
  TEST_FILE_WATCHER_RETRY_DELAY_MS,
  TEST_FILE_WATCHER_MAX_RETRIES,
} from '../config/constants';
import { Driver, DriverTelemetry } from '../types';

/**
 * Creates a mock DriverTelemetry object with sensible defaults.
 * All properties can be overridden via the overrides parameter.
 */
export const createMockTelemetry = (
  overrides?: Partial<DriverTelemetry>,
): DriverTelemetry => ({
  chipModel: 'ESP32',
  chipRevision: 1,
  chipCores: 2,
  cpuFreqMHz: 240,
  flashSize: 4194304,
  flashSpeed: 40000000,
  heapSize: 327680,
  psramSize: 0,
  freePsram: 0,
  sdkVersion: 'v4.4.2',
  sketchSize: 1000000,
  freeSketchSpace: 2000000,
  hasDisplay: false,
  firmwareVersion: '1.0.0',
  ...overrides,
});

interface MockDriverOptions {
  id?: string;
  mac?: string;
  ip?: string;
  hostname?: string;
  connected?: boolean;
  telemetry?: Partial<DriverTelemetry>;
}

/**
 * Creates a mock Driver instance with sensible defaults.
 * When connected=false, network fields are set to undefined.
 */
export const createMockDriver = (overrides?: MockDriverOptions): Driver => {
  const defaults = {
    id: 'test-driver',
    mac: 'AA:BB:CC:DD:EE:FF',
    ip: '192.168.1.100',
    hostname: 'rgfx-driver',
    connected: true,
  };
  const opts = { ...defaults, ...overrides };

  return new Driver({
    id: opts.id,
    mac: opts.mac,
    ip: opts.connected ? opts.ip : undefined,
    hostname: opts.connected ? opts.hostname : undefined,
    ssid: opts.connected ? 'TestNetwork' : undefined,
    rssi: opts.connected ? -50 : undefined,
    freeHeap: opts.connected ? 200000 : undefined,
    minFreeHeap: opts.connected ? 180000 : undefined,
    uptimeMs: opts.connected ? 60000 : undefined,
    lastSeen: Date.now(),
    lastSeenAt: opts.connected ? Date.now() : undefined,
    failedHeartbeats: 0,
    telemetry: opts.connected ? createMockTelemetry(overrides?.telemetry) : undefined,
    stats: {
      telemetryEventsReceived: 0,
      mqttMessagesReceived: 0,
      mqttMessagesFailed: 0,
      udpMessagesSent: 0,
      udpMessagesFailed: 0,
    },
    connected: opts.connected,
    remoteLogging: 'errors',
  });
};

interface MockTelemetryDataOptions {
  mac?: string;
  ip?: string;
  hostname?: string;
  ssid?: string;
  rssi?: number;
  freeHeap?: number;
  minFreeHeap?: number;
  uptimeMs?: number;
  telemetry?: Partial<DriverTelemetry>;
}

/**
 * Creates mock telemetry data as received from a driver via MQTT.
 * This is the format used by DriverRegistry.registerDriver().
 */
export const createMockTelemetryData = (overrides?: MockTelemetryDataOptions) => ({
  mac: overrides?.mac ?? 'AA:BB:CC:DD:EE:FF',
  ip: overrides?.ip ?? '192.168.1.100',
  hostname: overrides?.hostname ?? 'esp32-driver',
  ssid: overrides?.ssid ?? 'TestNetwork',
  rssi: overrides?.rssi ?? -50,
  freeHeap: overrides?.freeHeap ?? 200000,
  minFreeHeap: overrides?.minFreeHeap ?? 180000,
  uptimeMs: overrides?.uptimeMs ?? 60000,
  telemetry: createMockTelemetry(overrides?.telemetry),
});

/**
 * Write to a file and retry until a watcher detects the change.
 *
 * This solves the fs.watch initialization race condition on macOS where
 * the watcher may not be ready immediately after calling watch().
 *
 * Strategy: Write a probe event to test if watcher is ready, then write actual data.
 * The probe event "rgfx/test ready" will be ignored by production code but triggers
 * a callback, allowing us to detect when fs.watch is initialized.
 *
 * @param filePath - Path to the file to write
 * @param data - Data to write (will be appended once)
 * @param expectedCalls - How many callback invocations we expect from this data
 * @param getActualCalls - Function that returns current number of calls
 * @param options - Configuration options
 */
export async function waitForFileWatcherReady(
  filePath: string,
  data: string,
  expectedCalls: number,
  getActualCalls: () => number,
  options: {
    retryDelayMs?: number;
    maxRetries?: number;
  } = {},
): Promise<void> {
  const {
    retryDelayMs = TEST_FILE_WATCHER_RETRY_DELAY_MS,
    maxRetries = TEST_FILE_WATCHER_MAX_RETRIES,
  } = options; // 2 seconds total

  // Ensure file exists before we start retrying (create if needed)
  if (!existsSync(filePath)) {
    writeFileSync(filePath, '');
  }

  const initialCalls = getActualCalls();

  // Phase 1: Probe with test event until watcher responds
  let probeCallCount = 0;

  for (let i = 0; i < maxRetries; i++) {
    const callsBefore = getActualCalls();

    // Write probe event (valid format, will trigger callback)
    writeFileSync(filePath, 'rgfx/test ready\n', { flag: 'a' });
    probeCallCount++;

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));

    // If watcher called callback, it's ready - break out of the loop
    if (getActualCalls() > callsBefore) {
      break; // Stop immediately to avoid extra writes
    }

    // If we've exhausted all retries, watcher never became ready
    if (i === maxRetries - 1) {
      throw new Error(`File watcher did not initialize after ${maxRetries * retryDelayMs}ms`);
    }
  }

  // Phase 2: Write actual data once - watcher is ready
  writeFileSync(filePath, data, { flag: 'a' });

  // Phase 3: Wait for expected callbacks (including ALL probe writes)
  // We expect: probeCallCount callbacks + expectedCalls from actual data
  const targetCalls = initialCalls + probeCallCount + expectedCalls;

  for (let i = 0; i < maxRetries; i++) {
    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));

    if (getActualCalls() >= targetCalls) {
      return;
    }
  }

  throw new Error(
    `File watcher did not process data after ${maxRetries * retryDelayMs}ms. ` +
      `Expected ${targetCalls} total calls, got ${getActualCalls()}`,
  );
}
