/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { LEDHardwareSchema } from '../led-hardware';

describe('LEDHardwareSchema', () => {
  describe('valid data', () => {
    it('should accept minimal LED strip definition', () => {
      const data = {
        name: 'WS2812B Strip',
        sku: 'BTF-WS2812B-60',
        layout: 'strip',
        count: 60,
      };

      const result = LEDHardwareSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.name).toBe('WS2812B Strip');
        expect(result.data.count).toBe(60);
      }
    });

    it('should accept complete LED matrix definition', () => {
      const data = {
        name: '16x16 LED Matrix',
        description: 'BTF-LIGHTING WS2812B 16x16 Matrix Panel',
        sku: 'BTF-WS2812B-16x16',
        asin: 'B01DC0IIFQ',
        layout: 'matrix',
        count: 256,
        chipset: 'WS2812B',
        colorOrder: 'GRB',
        colorCorrection: 'TypicalSMD5050',
        width: 16,
        height: 16,
      };

      const result = LEDHardwareSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.width).toBe(16);
        expect(result.data.height).toBe(16);
        expect(result.data.chipset).toBe('WS2812B');
      }
    });

    it('should accept null sku', () => {
      const data = {
        name: 'Generic Strip',
        sku: null,
        layout: 'strip',
        count: 30,
      };

      const result = LEDHardwareSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should accept null asin', () => {
      const data = {
        name: 'Local Vendor Strip',
        sku: 'LOCAL-001',
        asin: null,
        layout: 'strip',
        count: 30,
      };

      const result = LEDHardwareSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('required fields', () => {
    it('should reject missing name', () => {
      const result = LEDHardwareSchema.safeParse({
        sku: 'SKU-001',
        layout: 'strip',
        count: 60,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing sku (not optional, but can be null)', () => {
      const result = LEDHardwareSchema.safeParse({
        name: 'Test Strip',
        layout: 'strip',
        count: 60,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing layout', () => {
      const result = LEDHardwareSchema.safeParse({
        name: 'Test Strip',
        sku: 'SKU-001',
        count: 60,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing count', () => {
      const result = LEDHardwareSchema.safeParse({
        name: 'Test Strip',
        sku: 'SKU-001',
        layout: 'strip',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('name validation', () => {
    it('should reject empty name', () => {
      const result = LEDHardwareSchema.safeParse({
        name: '',
        sku: 'SKU-001',
        layout: 'strip',
        count: 60,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('count validation', () => {
    it('should reject zero count', () => {
      const result = LEDHardwareSchema.safeParse({
        name: 'Test',
        sku: 'SKU-001',
        layout: 'strip',
        count: 0,
      });
      expect(result.success).toBe(false);
    });

    it('should reject negative count', () => {
      const result = LEDHardwareSchema.safeParse({
        name: 'Test',
        sku: 'SKU-001',
        layout: 'strip',
        count: -10,
      });
      expect(result.success).toBe(false);
    });

    it('should accept large count', () => {
      const result = LEDHardwareSchema.safeParse({
        name: 'Large Installation',
        sku: 'SKU-001',
        layout: 'strip',
        count: 10000,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('optional fields', () => {
    const baseHardware = {
      name: 'Test Strip',
      sku: 'SKU-001',
      layout: 'strip',
      count: 60,
    };

    it('should accept without description', () => {
      const result = LEDHardwareSchema.safeParse(baseHardware);
      expect(result.success).toBe(true);
    });

    it('should accept with description', () => {
      const result = LEDHardwareSchema.safeParse({
        ...baseHardware,
        description: 'A test LED strip for development',
      });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.description).toBe('A test LED strip for development');
      }
    });

    it('should accept chipset variants', () => {
      const chipsets = ['WS2812B', 'SK6812', 'APA102', 'WS2811', 'NEOPIXEL'];

      for (const chipset of chipsets) {
        const result = LEDHardwareSchema.safeParse({
          ...baseHardware,
          chipset,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should accept colorOrder variants', () => {
      const orders = ['GRB', 'RGB', 'BGR', 'GRBW', 'RGBW'];

      for (const colorOrder of orders) {
        const result = LEDHardwareSchema.safeParse({
          ...baseHardware,
          colorOrder,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('matrix dimensions', () => {
    const baseMatrix = {
      name: 'Test Matrix',
      sku: 'SKU-001',
      layout: 'matrix',
      count: 256,
    };

    it('should accept matrix with dimensions', () => {
      const result = LEDHardwareSchema.safeParse({
        ...baseMatrix,
        width: 16,
        height: 16,
      });
      expect(result.success).toBe(true);
    });

    it('should accept matrix without dimensions (optional)', () => {
      const result = LEDHardwareSchema.safeParse(baseMatrix);
      expect(result.success).toBe(true);
    });

    it('should accept non-square matrices', () => {
      const result = LEDHardwareSchema.safeParse({
        ...baseMatrix,
        count: 512,
        width: 32,
        height: 16,
      });
      expect(result.success).toBe(true);
    });
  });
});
