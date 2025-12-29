/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { ConfiguredDriverSchema, DriversConfigFileRawSchema } from '../driver-config';

describe('ConfiguredDriverSchema', () => {
  describe('valid data', () => {
    it('should accept minimal valid driver config', () => {
      const data = {
        id: 'rgfx-driver-0001',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      const result = ConfiguredDriverSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.id).toBe('rgfx-driver-0001');
        expect(result.data.macAddress).toBe('AA:BB:CC:DD:EE:FF');
        expect(result.data.remoteLogging).toBe('errors'); // default
      }
    });

    it('should accept complete driver config with LED config', () => {
      const data = {
        id: 'my-driver',
        macAddress: 'aa:bb:cc:dd:ee:ff',
        description: 'Living room LED panel',
        ledConfig: {
          hardwareRef: 'led-matrix-16x16',
          pin: 5,
          offset: 0,
          maxBrightness: 200,
          globalBrightnessLimit: 128,
          dithering: true,
          powerSupplyVolts: 5,
          maxPowerMilliamps: 2000,
          floor: { r: 0, g: 0, b: 0 },
        },
        remoteLogging: 'all',
      };

      const result = ConfiguredDriverSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.ledConfig?.hardwareRef).toBe('led-matrix-16x16');
        expect(result.data.ledConfig?.pin).toBe(5);
        expect(result.data.remoteLogging).toBe('all');
      }
    });

    it('should accept null LED config', () => {
      const data = {
        id: 'driver-1',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        ledConfig: null,
      };

      const result = ConfiguredDriverSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('id validation', () => {
    it('should reject empty id', () => {
      const data = {
        id: '',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      const result = ConfiguredDriverSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject id longer than 32 characters', () => {
      const data = {
        id: 'a'.repeat(33),
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      const result = ConfiguredDriverSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('should reject id with invalid characters', () => {
      const invalidIds = ['driver@home', 'driver name', 'driver.1', 'driver_1'];

      for (const id of invalidIds) {
        const result = ConfiguredDriverSchema.safeParse({
          id,
          macAddress: 'AA:BB:CC:DD:EE:FF',
        });
        expect(result.success).toBe(false);
      }
    });

    it('should accept id with alphanumeric and hyphens', () => {
      const validIds = ['driver-1', 'DRIVER-1', 'my-led-panel-01', 'rgfx-driver-0001'];

      for (const id of validIds) {
        const result = ConfiguredDriverSchema.safeParse({
          id,
          macAddress: 'AA:BB:CC:DD:EE:FF',
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('macAddress validation', () => {
    it('should accept uppercase MAC address', () => {
      const result = ConfiguredDriverSchema.safeParse({
        id: 'driver',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      });
      expect(result.success).toBe(true);
    });

    it('should accept lowercase MAC address', () => {
      const result = ConfiguredDriverSchema.safeParse({
        id: 'driver',
        macAddress: 'aa:bb:cc:dd:ee:ff',
      });
      expect(result.success).toBe(true);
    });

    it('should reject MAC without colons', () => {
      const result = ConfiguredDriverSchema.safeParse({
        id: 'driver',
        macAddress: 'AABBCCDDEEFF',
      });
      expect(result.success).toBe(false);
    });

    it('should reject MAC with wrong separator', () => {
      const result = ConfiguredDriverSchema.safeParse({
        id: 'driver',
        macAddress: 'AA-BB-CC-DD-EE-FF',
      });
      expect(result.success).toBe(false);
    });

    it('should reject MAC with wrong length', () => {
      const result = ConfiguredDriverSchema.safeParse({
        id: 'driver',
        macAddress: 'AA:BB:CC:DD:EE',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ledConfig validation', () => {
    const baseDriver = {
      id: 'driver',
      macAddress: 'AA:BB:CC:DD:EE:FF',
    };

    it('should reject pin below 0', () => {
      const result = ConfiguredDriverSchema.safeParse({
        ...baseDriver,
        ledConfig: { hardwareRef: 'led', pin: -1 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject pin above 39', () => {
      const result = ConfiguredDriverSchema.safeParse({
        ...baseDriver,
        ledConfig: { hardwareRef: 'led', pin: 40 },
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid pin range 0-39', () => {
      for (const pin of [0, 5, 16, 39]) {
        const result = ConfiguredDriverSchema.safeParse({
          ...baseDriver,
          ledConfig: { hardwareRef: 'led', pin },
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject maxBrightness above 255', () => {
      const result = ConfiguredDriverSchema.safeParse({
        ...baseDriver,
        ledConfig: { hardwareRef: 'led', pin: 5, maxBrightness: 256 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject powerSupplyVolts above 24', () => {
      const result = ConfiguredDriverSchema.safeParse({
        ...baseDriver,
        ledConfig: { hardwareRef: 'led', pin: 5, powerSupplyVolts: 25 },
      });
      expect(result.success).toBe(false);
    });

    it('should reject maxPowerMilliamps above 10000', () => {
      const result = ConfiguredDriverSchema.safeParse({
        ...baseDriver,
        ledConfig: { hardwareRef: 'led', pin: 5, maxPowerMilliamps: 10001 },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('remoteLogging validation', () => {
    it('should accept valid logging levels', () => {
      for (const level of ['all', 'errors', 'off']) {
        const result = ConfiguredDriverSchema.safeParse({
          id: 'driver',
          macAddress: 'AA:BB:CC:DD:EE:FF',
          remoteLogging: level,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid logging level', () => {
      const result = ConfiguredDriverSchema.safeParse({
        id: 'driver',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        remoteLogging: 'debug',
      });
      expect(result.success).toBe(false);
    });
  });

});

describe('DriversConfigFileRawSchema', () => {
  it('should accept valid config file structure', () => {
    const data = {
      version: '1.0',
      drivers: [{ id: 'driver-1', macAddress: 'AA:BB:CC:DD:EE:FF' }],
    };

    const result = DriversConfigFileRawSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should accept empty drivers array', () => {
    const data = {
      version: '1.0',
      drivers: [],
    };

    const result = DriversConfigFileRawSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('should reject missing version', () => {
    const data = {
      drivers: [],
    };

    const result = DriversConfigFileRawSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject empty version', () => {
    const data = {
      version: '',
      drivers: [],
    };

    const result = DriversConfigFileRawSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should accept any driver shape in raw schema', () => {
    // Raw schema uses z.unknown() for drivers to allow graceful skip
    const data = {
      version: '1.0',
      drivers: [{ invalid: 'data' }, 123, 'string'],
    };

    const result = DriversConfigFileRawSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
