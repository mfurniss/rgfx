/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { effectPropsSchemas } from '../index';

const projectileSchema = effectPropsSchemas.projectile;

describe('projectileSchema', () => {
  describe('valid data', () => {
    it('should accept empty object with all defaults', () => {
      const result = projectileSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.direction).toBe('right');
        expect(result.data.velocity).toBe(1200);
        expect(result.data.friction).toBe(0.5);
        expect(result.data.trail).toBe(0.2);
        expect(result.data.width).toBe(16);
        expect(result.data.height).toBe(6);
        expect(result.data.lifespan).toBe(5000);
      }
    });

    it('should accept complete projectile configuration', () => {
      const data = {
        color: '#FF0000',
        direction: 'left',
        velocity: 500,
        friction: 1.5,
        trail: 0.3,
        width: 8,
        height: 8,
        lifespan: 3000,
      };

      const result = projectileSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.direction).toBe('left');
        expect(result.data.velocity).toBe(500);
        expect(result.data.friction).toBe(1.5);
        expect(result.data.trail).toBe(0.3);
      }
    });
  });

  describe('direction validation', () => {
    it('should accept left direction', () => {
      const result = projectileSchema.safeParse({ direction: 'left' });
      expect(result.success).toBe(true);
    });

    it('should accept right direction', () => {
      const result = projectileSchema.safeParse({ direction: 'right' });
      expect(result.success).toBe(true);
    });

    it('should accept up direction', () => {
      const result = projectileSchema.safeParse({ direction: 'up' });
      expect(result.success).toBe(true);
    });

    it('should accept down direction', () => {
      const result = projectileSchema.safeParse({ direction: 'down' });
      expect(result.success).toBe(true);
    });

    it('should accept random direction', () => {
      const result = projectileSchema.safeParse({ direction: 'random' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid direction', () => {
      const result = projectileSchema.safeParse({ direction: 'diagonal' });
      expect(result.success).toBe(false);
    });
  });

  describe('velocity validation', () => {
    it('should accept minimum velocity', () => {
      const result = projectileSchema.safeParse({ velocity: 1 });
      expect(result.success).toBe(true);
    });

    it('should accept maximum velocity', () => {
      const result = projectileSchema.safeParse({ velocity: 5000 });
      expect(result.success).toBe(true);
    });

    it('should reject zero velocity', () => {
      const result = projectileSchema.safeParse({ velocity: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject velocity above max', () => {
      const result = projectileSchema.safeParse({ velocity: 5001 });
      expect(result.success).toBe(false);
    });
  });

  describe('friction validation', () => {
    it('should accept zero friction', () => {
      const result = projectileSchema.safeParse({ friction: 0 });
      expect(result.success).toBe(true);
    });

    it('should accept positive friction', () => {
      const result = projectileSchema.safeParse({ friction: 2.5 });
      expect(result.success).toBe(true);
    });

    it('should accept negative friction (acceleration)', () => {
      const result = projectileSchema.safeParse({ friction: -1 });
      expect(result.success).toBe(true);
    });
  });

  describe('trail validation', () => {
    it('should accept zero trail', () => {
      const result = projectileSchema.safeParse({ trail: 0 });
      expect(result.success).toBe(true);
    });

    it('should accept positive trail', () => {
      const result = projectileSchema.safeParse({ trail: 0.5 });
      expect(result.success).toBe(true);
    });

    it('should accept trail of 1.0 (full velocity)', () => {
      const result = projectileSchema.safeParse({ trail: 1.0 });
      expect(result.success).toBe(true);
    });

    it('should reject negative trail', () => {
      const result = projectileSchema.safeParse({ trail: -0.1 });
      expect(result.success).toBe(false);
    });
  });

  describe('width validation', () => {
    it('should accept minimum width', () => {
      const result = projectileSchema.safeParse({ width: 1 });
      expect(result.success).toBe(true);
    });

    it('should accept maximum width', () => {
      const result = projectileSchema.safeParse({ width: 64 });
      expect(result.success).toBe(true);
    });

    it('should reject zero width', () => {
      const result = projectileSchema.safeParse({ width: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject width above max', () => {
      const result = projectileSchema.safeParse({ width: 65 });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer width', () => {
      const result = projectileSchema.safeParse({ width: 16.5 });
      expect(result.success).toBe(false);
    });
  });

  describe('height validation', () => {
    it('should accept minimum height', () => {
      const result = projectileSchema.safeParse({ height: 1 });
      expect(result.success).toBe(true);
    });

    it('should accept maximum height', () => {
      const result = projectileSchema.safeParse({ height: 64 });
      expect(result.success).toBe(true);
    });

    it('should reject zero height', () => {
      const result = projectileSchema.safeParse({ height: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject height above max', () => {
      const result = projectileSchema.safeParse({ height: 65 });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer height', () => {
      const result = projectileSchema.safeParse({ height: 16.5 });
      expect(result.success).toBe(false);
    });
  });

  describe('lifespan validation', () => {
    it('should accept minimum lifespan', () => {
      const result = projectileSchema.safeParse({ lifespan: 100 });
      expect(result.success).toBe(true);
    });

    it('should accept maximum lifespan', () => {
      const result = projectileSchema.safeParse({ lifespan: 30000 });
      expect(result.success).toBe(true);
    });

    it('should reject lifespan below minimum', () => {
      const result = projectileSchema.safeParse({ lifespan: 99 });
      expect(result.success).toBe(false);
    });

    it('should reject lifespan above max', () => {
      const result = projectileSchema.safeParse({ lifespan: 30001 });
      expect(result.success).toBe(false);
    });
  });

  describe('strict mode', () => {
    it('should reject unknown properties', () => {
      const result = projectileSchema.safeParse({
        color: 'red',
        gravity: 9.8,
      });
      expect(result.success).toBe(false);
    });
  });
});
