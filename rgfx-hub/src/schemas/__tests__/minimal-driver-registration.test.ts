import { describe, it, expect } from 'vitest';
import { MinimalDriverRegistrationSchema } from '../minimal-driver-registration';

describe('MinimalDriverRegistrationSchema', () => {
  describe('valid data', () => {
    it('should accept minimal required fields only', () => {
      const data = {
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
      };

      const result = MinimalDriverRegistrationSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.ip).toBe('192.168.1.100');
        expect(result.data.mac).toBe('AA:BB:CC:DD:EE:FF');
      }
    });

    it('should accept with all optional fields', () => {
      const data = {
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
        sdkVersion: 'v5.1.1',
        sketchSize: 1500000,
        freeSketchSpace: 2500000,
        firmwareVersion: '1.2.3',
        testActive: false,
        mqttMessagesReceived: 100,
        udpMessagesReceived: 50,
        currentFps: 120.0,
        minFps: 118.0,
        maxFps: 122.0,
      };

      const result = MinimalDriverRegistrationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept partial optional fields', () => {
      const data = {
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        firmwareVersion: '1.0.0',
        hostname: 'old-driver',
      };

      const result = MinimalDriverRegistrationSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.firmwareVersion).toBe('1.0.0');
        expect(result.data.hostname).toBe('old-driver');
        expect(result.data.rssi).toBeUndefined();
      }
    });
  });

  describe('required fields', () => {
    it('should reject missing ip', () => {
      const result = MinimalDriverRegistrationSchema.safeParse({
        mac: 'AA:BB:CC:DD:EE:FF',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing mac', () => {
      const result = MinimalDriverRegistrationSchema.safeParse({
        ip: '192.168.1.100',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty ip', () => {
      const result = MinimalDriverRegistrationSchema.safeParse({
        ip: '',
        mac: 'AA:BB:CC:DD:EE:FF',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('mac address validation', () => {
    it('should accept uppercase MAC', () => {
      const result = MinimalDriverRegistrationSchema.safeParse({
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
      });
      expect(result.success).toBe(true);
    });

    it('should accept lowercase MAC', () => {
      const result = MinimalDriverRegistrationSchema.safeParse({
        ip: '192.168.1.100',
        mac: 'aa:bb:cc:dd:ee:ff',
      });
      expect(result.success).toBe(true);
    });

    it('should accept mixed case MAC', () => {
      const result = MinimalDriverRegistrationSchema.safeParse({
        ip: '192.168.1.100',
        mac: 'Aa:Bb:Cc:Dd:Ee:Ff',
      });
      expect(result.success).toBe(true);
    });

    it('should reject MAC without colons', () => {
      const result = MinimalDriverRegistrationSchema.safeParse({
        ip: '192.168.1.100',
        mac: 'AABBCCDDEEFF',
      });
      expect(result.success).toBe(false);
    });

    it('should reject MAC with dashes', () => {
      const result = MinimalDriverRegistrationSchema.safeParse({
        ip: '192.168.1.100',
        mac: 'AA-BB-CC-DD-EE-FF',
      });
      expect(result.success).toBe(false);
    });

    it('should reject MAC with wrong segment count', () => {
      const result = MinimalDriverRegistrationSchema.safeParse({
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE',
      });
      expect(result.success).toBe(false);
    });

    it('should reject MAC with invalid hex characters', () => {
      const result = MinimalDriverRegistrationSchema.safeParse({
        ip: '192.168.1.100',
        mac: 'GG:HH:II:JJ:KK:LL',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('optional field types', () => {
    const base = {
      ip: '192.168.1.100',
      mac: 'AA:BB:CC:DD:EE:FF',
    };

    it('should reject non-string hostname', () => {
      const result = MinimalDriverRegistrationSchema.safeParse({
        ...base,
        hostname: 12345,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-number rssi', () => {
      const result = MinimalDriverRegistrationSchema.safeParse({
        ...base,
        rssi: '-65',
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean testActive', () => {
      const result = MinimalDriverRegistrationSchema.safeParse({
        ...base,
        testActive: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('backward compatibility', () => {
    // This schema exists for old firmware that doesn't send complete telemetry
    it('should work as fallback when only critical fields are present', () => {
      // Old firmware might only send IP and MAC
      const oldFirmwareData = {
        ip: '10.0.0.50',
        mac: '12:34:56:78:9A:BC',
      };

      const result = MinimalDriverRegistrationSchema.safeParse(oldFirmwareData);
      expect(result.success).toBe(true);
    });

    it('should extract firmwareVersion for update detection', () => {
      const data = {
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        firmwareVersion: '0.9.0',
      };

      const result = MinimalDriverRegistrationSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.firmwareVersion).toBe('0.9.0');
      }
    });
  });
});
