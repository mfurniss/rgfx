/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { DriverRegistrationSchema } from '../driver-registration';

describe('DriverRegistrationSchema', () => {
  // DriverRegistration combines network info, runtime metrics, and telemetry
  const validRegistration = {
    ip: '192.168.1.100',
    mac: 'AA:BB:CC:DD:EE:FF',
    hostname: 'rgfx-driver-0001',
    ssid: 'MyNetwork',
    rssi: -65,
    freeHeap: 200000,
    minFreeHeap: 150000,
    uptimeMs: 3600000,
    testActive: false,
    mqttMessagesReceived: 100,
    udpMessagesReceived: 50,
    telemetry: {
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
    },
  };

  describe('valid data', () => {
    it('should accept complete registration data', () => {
      const result = DriverRegistrationSchema.safeParse(validRegistration);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.ip).toBe('192.168.1.100');
        expect(result.data.telemetry.chipModel).toBe('ESP32-S3');
      }
    });

    it('should accept registration without optional message counters', () => {
      const { mqttMessagesReceived: _, udpMessagesReceived: __, ...data } = validRegistration;
      const result = DriverRegistrationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept registration without optional testActive', () => {
      const { testActive: _, ...data } = validRegistration;
      const result = DriverRegistrationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('required fields', () => {
    it('should reject when ip is missing', () => {
      const { ip: _, ...data } = validRegistration;
      const result = DriverRegistrationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject when mac is missing', () => {
      const { mac: _, ...data } = validRegistration;
      const result = DriverRegistrationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject when hostname is missing', () => {
      const { hostname: _, ...data } = validRegistration;
      const result = DriverRegistrationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject when ssid is missing', () => {
      const { ssid: _, ...data } = validRegistration;
      const result = DriverRegistrationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject when rssi is missing', () => {
      const { rssi: _, ...data } = validRegistration;
      const result = DriverRegistrationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject when freeHeap is missing', () => {
      const { freeHeap: _, ...data } = validRegistration;
      const result = DriverRegistrationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject when minFreeHeap is missing', () => {
      const { minFreeHeap: _, ...data } = validRegistration;
      const result = DriverRegistrationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject when uptimeMs is missing', () => {
      const { uptimeMs: _, ...data } = validRegistration;
      const result = DriverRegistrationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject when telemetry is missing', () => {
      const { telemetry: _, ...data } = validRegistration;
      const result = DriverRegistrationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('telemetry nested validation', () => {
    it('should reject when telemetry is missing required fields', () => {
      const { chipModel: _, ...incompleteTelemetry } = validRegistration.telemetry;
      const result = DriverRegistrationSchema.safeParse({
        ...validRegistration,
        telemetry: incompleteTelemetry,
      });
      expect(result.success).toBe(false);
    });

    it('should accept telemetry without optional firmwareVersion', () => {
      const { firmwareVersion: _, ...telemetryWithoutFirmware } = validRegistration.telemetry;
      const result = DriverRegistrationSchema.safeParse({
        ...validRegistration,
        telemetry: telemetryWithoutFirmware,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('type validation', () => {
    it('should reject non-string IP', () => {
      const result = DriverRegistrationSchema.safeParse({
        ...validRegistration,
        ip: 192168100,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-number rssi', () => {
      const result = DriverRegistrationSchema.safeParse({
        ...validRegistration,
        rssi: 'strong',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean testActive', () => {
      const result = DriverRegistrationSchema.safeParse({
        ...validRegistration,
        testActive: 'yes',
      });
      expect(result.success).toBe(false);
    });

    it('should accept typical RSSI values', () => {
      for (const rssi of [-30, -50, -70, -90]) {
        const result = DriverRegistrationSchema.safeParse({
          ...validRegistration,
          rssi,
        });
        expect(result.success).toBe(true);
      }
    });
  });
});
