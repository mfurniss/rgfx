/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { DriverTelemetry } from '@/types';

/**
 * Default telemetry data shared between payload and data factories.
 */
const defaultTelemetryBase = {
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
};

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
    ...defaultTelemetryBase,
    ...overrides,
  });
}

/**
 * Creates a mock DriverTelemetry object with sensible defaults.
 * All properties can be overridden via the overrides parameter.
 *
 * @example
 * const telemetry = createMockTelemetry({ firmwareVersion: '2.0.0' })
 */
export function createMockTelemetry(overrides?: Partial<DriverTelemetry>): DriverTelemetry {
  return {
    chipModel: defaultTelemetryBase.chipModel,
    chipRevision: defaultTelemetryBase.chipRevision,
    chipCores: defaultTelemetryBase.chipCores,
    cpuFreqMHz: defaultTelemetryBase.cpuFreqMHz,
    flashSize: defaultTelemetryBase.flashSize,
    flashSpeed: defaultTelemetryBase.flashSpeed,
    heapSize: defaultTelemetryBase.heapSize,
    psramSize: defaultTelemetryBase.psramSize,
    freePsram: defaultTelemetryBase.freePsram,
    sdkVersion: defaultTelemetryBase.sdkVersion,
    sketchSize: defaultTelemetryBase.sketchSize,
    freeSketchSpace: defaultTelemetryBase.freeSketchSpace,
    hasDisplay: defaultTelemetryBase.hasDisplay,
    firmwareVersion: defaultTelemetryBase.firmwareVersion,
    currentFps: defaultTelemetryBase.currentFps,
    minFps: defaultTelemetryBase.minFps,
    maxFps: defaultTelemetryBase.maxFps,
    ...overrides,
  };
}

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
 *
 * @example
 * const data = createMockTelemetryData({ ip: '192.168.1.200' })
 * registry.registerDriver(data)
 */
export function createMockTelemetryData(overrides?: MockTelemetryDataOptions) {
  return {
    mac: overrides?.mac ?? defaultTelemetryBase.mac,
    ip: overrides?.ip ?? defaultTelemetryBase.ip,
    hostname: overrides?.hostname ?? 'esp32-driver',
    ssid: overrides?.ssid ?? defaultTelemetryBase.ssid,
    rssi: overrides?.rssi ?? defaultTelemetryBase.rssi,
    freeHeap: overrides?.freeHeap ?? defaultTelemetryBase.freeHeap,
    minFreeHeap: overrides?.minFreeHeap ?? defaultTelemetryBase.minFreeHeap,
    uptimeMs: overrides?.uptimeMs ?? defaultTelemetryBase.uptimeMs,
    telemetry: createMockTelemetry(overrides?.telemetry),
  };
}
