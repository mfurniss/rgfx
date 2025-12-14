/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { TelemetryPayloadSchema } from '../telemetry-payload';

describe('TelemetryPayloadSchema', () => {
  const validTelemetry = {
    ip: '192.168.1.100',
    mac: 'AA:BB:CC:DD:EE:FF',
    hostname: 'rgfx-driver-0001',
    ssid: 'MyNetwork',
    rssi: -65,
    freeHeap: 200000,
    minFreeHeap: 150000,
    uptimeMs: 3600000,
    chipModel: 'ESP32-S3',
    chipRevision: 1,
    chipCores: 2,
    cpuFreqMHz: 240,
    flashSize: 4194304,
    flashSpeed: 80000000,
    heapSize: 327680,
    psramSize: 8388608,
    freePsram: 8000000,
    hasDisplay: true,
    sdkVersion: 'v5.1.1',
    sketchSize: 1500000,
    freeSketchSpace: 2500000,
    currentFps: 120.0,
    minFps: 118.0,
    maxFps: 122.0,
  };

  describe('valid data', () => {
    it('should accept complete telemetry payload', () => {
      const result = TelemetryPayloadSchema.safeParse(validTelemetry);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.chipModel).toBe('ESP32-S3');
        expect(result.data.hasDisplay).toBe(true);
      }
    });

    it('should accept telemetry with optional fields', () => {
      const data = {
        ...validTelemetry,
        firmwareVersion: '1.2.3',
        testActive: true,
        mqttMessagesReceived: 100,
        udpMessagesReceived: 50,
      };

      const result = TelemetryPayloadSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.firmwareVersion).toBe('1.2.3');
        expect(result.data.testActive).toBe(true);
        expect(result.data.mqttMessagesReceived).toBe(100);
      }
    });

    it('should accept telemetry without optional fields', () => {
      const result = TelemetryPayloadSchema.safeParse(validTelemetry);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.firmwareVersion).toBeUndefined();
        expect(result.data.testActive).toBeUndefined();
        expect(result.data.mqttMessagesReceived).toBeUndefined();
      }
    });
  });

  describe('required fields', () => {
    it('should reject when ip is missing', () => {
      const { ip: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when mac is missing', () => {
      const { mac: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when hostname is missing', () => {
      const { hostname: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when ssid is missing', () => {
      const { ssid: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when rssi is missing', () => {
      const { rssi: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when freeHeap is missing', () => {
      const { freeHeap: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when minFreeHeap is missing', () => {
      const { minFreeHeap: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when uptimeMs is missing', () => {
      const { uptimeMs: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when chipModel is missing', () => {
      const { chipModel: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when chipRevision is missing', () => {
      const { chipRevision: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when chipCores is missing', () => {
      const { chipCores: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when cpuFreqMHz is missing', () => {
      const { cpuFreqMHz: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when flashSize is missing', () => {
      const { flashSize: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when flashSpeed is missing', () => {
      const { flashSpeed: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when heapSize is missing', () => {
      const { heapSize: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when psramSize is missing', () => {
      const { psramSize: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when freePsram is missing', () => {
      const { freePsram: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when hasDisplay is missing', () => {
      const { hasDisplay: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when sdkVersion is missing', () => {
      const { sdkVersion: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when sketchSize is missing', () => {
      const { sketchSize: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });

    it('should reject when freeSketchSpace is missing', () => {
      const { freeSketchSpace: _, ...data } = validTelemetry;
      expect(TelemetryPayloadSchema.safeParse(data).success).toBe(false);
    });
  });

  describe('type validation', () => {
    it('should reject non-string ip', () => {
      const result = TelemetryPayloadSchema.safeParse({
        ...validTelemetry,
        ip: 12345,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-number rssi', () => {
      const result = TelemetryPayloadSchema.safeParse({
        ...validTelemetry,
        rssi: '-65',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean hasDisplay', () => {
      const result = TelemetryPayloadSchema.safeParse({
        ...validTelemetry,
        hasDisplay: 'yes',
      });
      expect(result.success).toBe(false);
    });

    it('should accept negative rssi values', () => {
      const result = TelemetryPayloadSchema.safeParse({
        ...validTelemetry,
        rssi: -90,
      });
      expect(result.success).toBe(true);
    });

    it('should accept zero for numeric metrics', () => {
      const result = TelemetryPayloadSchema.safeParse({
        ...validTelemetry,
        psramSize: 0,
        freePsram: 0,
      });
      expect(result.success).toBe(true);
    });
  });
});
