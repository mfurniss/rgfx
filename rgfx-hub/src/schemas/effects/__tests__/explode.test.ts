/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { effectPropsSchemas } from '../index';

const explodeSchema = effectPropsSchemas.explode;

describe('explodeSchema', () => {
  describe('valid data', () => {
    it('should accept empty object with all defaults', () => {
      const result = explodeSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.color).toBe('random');
        expect(result.data.reset).toBe(false);
        expect(result.data.centerX).toBe(50);
        expect(result.data.centerY).toBe(50);
        expect(result.data.friction).toBe(3.0);
        expect(result.data.hueSpread).toBe(0);
        expect(result.data.lifespan).toBe(700);
        expect(result.data.lifespanSpread).toBe(1.6);
        expect(result.data.particleCount).toBe(100);
        expect(result.data.particleSize).toBe(6);
        expect(result.data.power).toBe(70);
        expect(result.data.powerSpread).toBe(1.6);
      }
    });

    it('should accept complete explode configuration', () => {
      const data = {
        color: '#00FF00',
        reset: true,
        centerX: 25,
        centerY: 75,
        friction: 5.0,
        hueSpread: 60,
        lifespan: 1000,
        lifespanSpread: 2.0,
        particleCount: 200,
        particleSize: 8,
        power: 100,
        powerSpread: 2.5,
      };

      const result = explodeSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.centerX).toBe(25);
        expect(result.data.particleCount).toBe(200);
      }
    });
  });

  describe('centerX/centerY validation', () => {
    it('should accept random as centerX', () => {
      const result = explodeSchema.safeParse({ centerX: 'random' });
      expect(result.success).toBe(true);
    });

    it('should accept random as centerY', () => {
      const result = explodeSchema.safeParse({ centerY: 'random' });
      expect(result.success).toBe(true);
    });

    it('should accept numeric centerX', () => {
      const result = explodeSchema.safeParse({ centerX: 0 });
      expect(result.success).toBe(true);
    });

    it('should accept numeric centerY', () => {
      const result = explodeSchema.safeParse({ centerY: 100 });
      expect(result.success).toBe(true);
    });

    it('should reject non-random string for centerX', () => {
      const result = explodeSchema.safeParse({ centerX: 'center' });
      expect(result.success).toBe(false);
    });
  });

  describe('friction validation', () => {
    it('should accept zero friction', () => {
      const result = explodeSchema.safeParse({ friction: 0 });
      expect(result.success).toBe(true);
    });

    it('should accept max friction', () => {
      const result = explodeSchema.safeParse({ friction: 50 });
      expect(result.success).toBe(true);
    });

    it('should reject friction above max', () => {
      const result = explodeSchema.safeParse({ friction: 51 });
      expect(result.success).toBe(false);
    });

    it('should reject negative friction', () => {
      const result = explodeSchema.safeParse({ friction: -1 });
      expect(result.success).toBe(false);
    });
  });

  describe('hueSpread validation', () => {
    it('should accept zero hueSpread', () => {
      const result = explodeSchema.safeParse({ hueSpread: 0 });
      expect(result.success).toBe(true);
    });

    it('should accept max hueSpread', () => {
      const result = explodeSchema.safeParse({ hueSpread: 359 });
      expect(result.success).toBe(true);
    });

    it('should reject hueSpread above 359', () => {
      const result = explodeSchema.safeParse({ hueSpread: 360 });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer hueSpread', () => {
      const result = explodeSchema.safeParse({ hueSpread: 40.5 });
      expect(result.success).toBe(false);
    });
  });

  describe('particleCount validation', () => {
    it('should accept minimum particle count', () => {
      const result = explodeSchema.safeParse({ particleCount: 1 });
      expect(result.success).toBe(true);
    });

    it('should accept maximum particle count', () => {
      const result = explodeSchema.safeParse({ particleCount: 500 });
      expect(result.success).toBe(true);
    });

    it('should reject zero particle count', () => {
      const result = explodeSchema.safeParse({ particleCount: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject particle count above max', () => {
      const result = explodeSchema.safeParse({ particleCount: 501 });
      expect(result.success).toBe(false);
    });
  });

  describe('particleSize validation', () => {
    it('should accept minimum particle size', () => {
      const result = explodeSchema.safeParse({ particleSize: 1 });
      expect(result.success).toBe(true);
    });

    it('should accept maximum particle size', () => {
      const result = explodeSchema.safeParse({ particleSize: 16 });
      expect(result.success).toBe(true);
    });

    it('should reject zero particle size', () => {
      const result = explodeSchema.safeParse({ particleSize: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject particle size above max', () => {
      const result = explodeSchema.safeParse({ particleSize: 17 });
      expect(result.success).toBe(false);
    });
  });

  describe('power validation', () => {
    it('should accept minimum power', () => {
      const result = explodeSchema.safeParse({ power: 1 });
      expect(result.success).toBe(true);
    });

    it('should accept maximum power', () => {
      const result = explodeSchema.safeParse({ power: 1000 });
      expect(result.success).toBe(true);
    });

    it('should reject power below min', () => {
      const result = explodeSchema.safeParse({ power: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject power above max', () => {
      const result = explodeSchema.safeParse({ power: 1001 });
      expect(result.success).toBe(false);
    });
  });

  describe('lifespan validation', () => {
    it('should reject zero lifespan', () => {
      const result = explodeSchema.safeParse({ lifespan: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative lifespan', () => {
      const result = explodeSchema.safeParse({ lifespan: -100 });
      expect(result.success).toBe(false);
    });

    it('should accept positive lifespan', () => {
      const result = explodeSchema.safeParse({ lifespan: 500 });
      expect(result.success).toBe(true);
    });
  });

  describe('strict mode', () => {
    it('should reject unknown properties', () => {
      const result = explodeSchema.safeParse({
        color: 'red',
        gravity: 9.8,
      });
      expect(result.success).toBe(false);
    });
  });
});
