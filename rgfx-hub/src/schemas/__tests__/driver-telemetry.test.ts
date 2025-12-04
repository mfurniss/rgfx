/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { DriverTelemetrySchema } from '../driver-telemetry';

describe('DriverTelemetrySchema', () => {
  // DriverTelemetry is a picked subset of TelemetryPayload for hardware/firmware info
  const validTelemetry = {
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
    firmwareVersion: '1.2.3',
    sdkVersion: 'v5.1.1',
    sketchSize: 1500000,
    freeSketchSpace: 2500000,
  };

  describe('valid data', () => {
    it('should accept complete telemetry', () => {
      const result = DriverTelemetrySchema.safeParse(validTelemetry);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.chipModel).toBe('ESP32-S3');
        expect(result.data.firmwareVersion).toBe('1.2.3');
      }
    });

    it('should accept telemetry without optional firmwareVersion', () => {
      const { firmwareVersion: _, ...dataWithoutFirmware } = validTelemetry;
      const result = DriverTelemetrySchema.safeParse(dataWithoutFirmware);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.firmwareVersion).toBeUndefined();
      }
    });
  });

  describe('should only include hardware/firmware fields', () => {
    it('should strip non-telemetry fields', () => {
      const dataWithExtra = {
        ...validTelemetry,
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        hostname: 'test',
        ssid: 'MyNetwork',
        rssi: -65,
        freeHeap: 200000,
        minFreeHeap: 150000,
        uptimeMs: 3600000,
      };

      const result = DriverTelemetrySchema.safeParse(dataWithExtra);
      expect(result.success).toBe(true);

      if (result.success) {
        // These fields should not be in the result since schema is .pick()
        expect('ip' in result.data).toBe(false);
        expect('mac' in result.data).toBe(false);
        expect('rssi' in result.data).toBe(false);
      }
    });
  });

  describe('required fields', () => {
    it('should reject when chipModel is missing', () => {
      const { chipModel: _, ...data } = validTelemetry;
      expect(DriverTelemetrySchema.safeParse(data).success).toBe(false);
    });

    it('should reject when chipRevision is missing', () => {
      const { chipRevision: _, ...data } = validTelemetry;
      expect(DriverTelemetrySchema.safeParse(data).success).toBe(false);
    });

    it('should reject when chipCores is missing', () => {
      const { chipCores: _, ...data } = validTelemetry;
      expect(DriverTelemetrySchema.safeParse(data).success).toBe(false);
    });

    it('should reject when cpuFreqMHz is missing', () => {
      const { cpuFreqMHz: _, ...data } = validTelemetry;
      expect(DriverTelemetrySchema.safeParse(data).success).toBe(false);
    });

    it('should reject when flashSize is missing', () => {
      const { flashSize: _, ...data } = validTelemetry;
      expect(DriverTelemetrySchema.safeParse(data).success).toBe(false);
    });

    it('should reject when flashSpeed is missing', () => {
      const { flashSpeed: _, ...data } = validTelemetry;
      expect(DriverTelemetrySchema.safeParse(data).success).toBe(false);
    });

    it('should reject when heapSize is missing', () => {
      const { heapSize: _, ...data } = validTelemetry;
      expect(DriverTelemetrySchema.safeParse(data).success).toBe(false);
    });

    it('should reject when psramSize is missing', () => {
      const { psramSize: _, ...data } = validTelemetry;
      expect(DriverTelemetrySchema.safeParse(data).success).toBe(false);
    });

    it('should reject when freePsram is missing', () => {
      const { freePsram: _, ...data } = validTelemetry;
      expect(DriverTelemetrySchema.safeParse(data).success).toBe(false);
    });

    it('should reject when hasDisplay is missing', () => {
      const { hasDisplay: _, ...data } = validTelemetry;
      expect(DriverTelemetrySchema.safeParse(data).success).toBe(false);
    });

    it('should reject when sdkVersion is missing', () => {
      const { sdkVersion: _, ...data } = validTelemetry;
      expect(DriverTelemetrySchema.safeParse(data).success).toBe(false);
    });

    it('should reject when sketchSize is missing', () => {
      const { sketchSize: _, ...data } = validTelemetry;
      expect(DriverTelemetrySchema.safeParse(data).success).toBe(false);
    });

    it('should reject when freeSketchSpace is missing', () => {
      const { freeSketchSpace: _, ...data } = validTelemetry;
      expect(DriverTelemetrySchema.safeParse(data).success).toBe(false);
    });
  });

  describe('type validation', () => {
    it('should reject non-number chipRevision', () => {
      const result = DriverTelemetrySchema.safeParse({
        ...validTelemetry,
        chipRevision: 'v1',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean hasDisplay', () => {
      const result = DriverTelemetrySchema.safeParse({
        ...validTelemetry,
        hasDisplay: 1,
      });
      expect(result.success).toBe(false);
    });

    it('should accept ESP32 variant chip models', () => {
      const variants = ['ESP32', 'ESP32-S2', 'ESP32-S3', 'ESP32-C3', 'ESP32-C6'];

      for (const chipModel of variants) {
        const result = DriverTelemetrySchema.safeParse({
          ...validTelemetry,
          chipModel,
        });
        expect(result.success).toBe(true);
      }
    });
  });
});
