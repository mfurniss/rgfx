import { describe, it, expect, vi } from 'vitest';
import { MinimalDriverRegistrationSchema } from '../schemas/minimal-driver-registration';

// Mock electron-log
vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('MinimalDriverRegistrationSchema', () => {
  describe('Valid minimal registration', () => {
    it('should accept IP + MAC only', () => {
      const minimal = {
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
      };

      const result = MinimalDriverRegistrationSchema.safeParse(minimal);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.ip).toBe('192.168.1.100');
        expect(result.data.mac).toBe('AA:BB:CC:DD:EE:FF');
        expect(result.data.hostname).toBeUndefined();
        expect(result.data.firmwareVersion).toBeUndefined();
      }
    });

    it('should accept IP + MAC + optional fields', () => {
      const minimal = {
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        hostname: 'esp32-test',
        ssid: 'TestNetwork',
        firmwareVersion: '0.0.1-old',
        chipModel: 'ESP32-S2',
      };

      const result = MinimalDriverRegistrationSchema.safeParse(minimal);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.hostname).toBe('esp32-test');
        expect(result.data.firmwareVersion).toBe('0.0.1-old');
        expect(result.data.chipModel).toBe('ESP32-S2');
      }
    });

    it('should accept lowercase MAC address', () => {
      const minimal = {
        ip: '192.168.1.100',
        mac: 'aa:bb:cc:dd:ee:ff',
      };

      const result = MinimalDriverRegistrationSchema.safeParse(minimal);

      expect(result.success).toBe(true);
    });

    it('should accept mixed case MAC address', () => {
      const minimal = {
        ip: '192.168.1.100',
        mac: 'Aa:Bb:Cc:Dd:Ee:Ff',
      };

      const result = MinimalDriverRegistrationSchema.safeParse(minimal);

      expect(result.success).toBe(true);
    });
  });

  describe('Invalid minimal registration', () => {
    it('should reject missing IP', () => {
      const minimal = {
        mac: 'AA:BB:CC:DD:EE:FF',
      };

      const result = MinimalDriverRegistrationSchema.safeParse(minimal);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ['ip'],
            code: 'invalid_type',
          }),
        );
      }
    });

    it('should reject missing MAC', () => {
      const minimal = {
        ip: '192.168.1.100',
      };

      const result = MinimalDriverRegistrationSchema.safeParse(minimal);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ['mac'],
            code: 'invalid_type',
          }),
        );
      }
    });

    it('should reject empty IP', () => {
      const minimal = {
        ip: '',
        mac: 'AA:BB:CC:DD:EE:FF',
      };

      const result = MinimalDriverRegistrationSchema.safeParse(minimal);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ['ip'],
            code: 'too_small',
          }),
        );
      }
    });

    it('should reject invalid MAC format (missing colons)', () => {
      const minimal = {
        ip: '192.168.1.100',
        mac: 'AABBCCDDEEFF',
      };

      const result = MinimalDriverRegistrationSchema.safeParse(minimal);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ['mac'],
            code: 'invalid_format',
          }),
        );
      }
    });

    it('should reject invalid MAC format (wrong length)', () => {
      const minimal = {
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE',
      };

      const result = MinimalDriverRegistrationSchema.safeParse(minimal);

      expect(result.success).toBe(false);
    });

    it('should reject invalid MAC format (invalid characters)', () => {
      const minimal = {
        ip: '192.168.1.100',
        mac: 'ZZ:BB:CC:DD:EE:FF',
      };

      const result = MinimalDriverRegistrationSchema.safeParse(minimal);

      expect(result.success).toBe(false);
    });
  });

  describe('Optional field types', () => {
    it('should accept numeric fields when provided', () => {
      const minimal = {
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        rssi: -50,
        freeHeap: 200000,
        chipRevision: 3,
        cpuFreqMHz: 240,
      };

      const result = MinimalDriverRegistrationSchema.safeParse(minimal);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.rssi).toBe(-50);
        expect(result.data.freeHeap).toBe(200000);
        expect(result.data.chipRevision).toBe(3);
        expect(result.data.cpuFreqMHz).toBe(240);
      }
    });

    it('should accept boolean fields when provided', () => {
      const minimal = {
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        testActive: false,
      };

      const result = MinimalDriverRegistrationSchema.safeParse(minimal);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.testActive).toBe(false);
      }
    });

    it('should reject invalid types for optional fields', () => {
      const minimal = {
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        rssi: 'not-a-number', // Should be number
      };

      const result = MinimalDriverRegistrationSchema.safeParse(minimal);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            path: ['rssi'],
            code: 'invalid_type',
          }),
        );
      }
    });
  });

  describe('Real-world scenarios', () => {
    it('should accept old firmware with only IP and MAC', () => {
      // Simulates old firmware that doesn't send complete telemetry
      const oldFirmware = {
        ip: '4:F8:CF:68',
        mac: '4:F8:CF:68',
      };

      const result = MinimalDriverRegistrationSchema.safeParse(oldFirmware);

      // This should FAIL because MAC format is invalid (missing leading zeros)
      expect(result.success).toBe(false);
    });

    it('should accept old firmware with properly formatted MAC', () => {
      // Simulates old firmware with proper MAC format
      const oldFirmware = {
        ip: '192.168.10.62',
        mac: '04:F8:CF:00:68:01',
      };

      const result = MinimalDriverRegistrationSchema.safeParse(oldFirmware);

      expect(result.success).toBe(true);
    });

    it('should accept firmware in transition (partial telemetry)', () => {
      // Simulates firmware that's partially updated
      const partialTelemetry = {
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        hostname: 'esp32-driver',
        ssid: 'HomeNetwork',
        rssi: -60,
        // Missing all hardware telemetry but has network info
      };

      const result = MinimalDriverRegistrationSchema.safeParse(partialTelemetry);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.hostname).toBe('esp32-driver');
        expect(result.data.ssid).toBe('HomeNetwork');
        expect(result.data.rssi).toBe(-60);
        // Hardware fields should be undefined
        expect(result.data.chipModel).toBeUndefined();
        expect(result.data.firmwareVersion).toBeUndefined();
      }
    });
  });
});
