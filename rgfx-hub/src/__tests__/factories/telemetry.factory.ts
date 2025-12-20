/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

/**
 * Factory function to create mock telemetry payload JSON strings for testing.
 * This is the raw MQTT payload format sent by drivers.
 *
 * @example
 * // Default payload
 * const payload = createMockTelemetryPayload()
 *
 * // Override specific fields
 * const customPayload = createMockTelemetryPayload({ currentFps: 60, rssi: -70 })
 */
export function createMockTelemetryPayload(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    ip: '192.168.1.100',
    mac: 'AA:BB:CC:DD:EE:FF',
    hostname: 'rgfx-driver-0001',
    ssid: 'TestNetwork',
    rssi: -50,
    freeHeap: 200000,
    minFreeHeap: 180000,
    uptimeMs: 60000,
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
    firmwareVersion: '1.0.0',
    currentFps: 120.0,
    minFps: 118.0,
    maxFps: 122.0,
    ...overrides,
  });
}
