/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import bitmapSchema from '../bitmap';

describe('bitmapSchema', () => {
  describe('valid data', () => {
    it('should accept empty object with all defaults', () => {
      const result = bitmapSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.color).toBe('random');
        expect(result.data.reset).toBe(false);
        expect(result.data.centerX).toBe(50);
        expect(result.data.centerY).toBe(50);
        expect(result.data.duration).toBe(400);
        expect(result.data.image).toHaveLength(16);
      }
    });

    it('should accept complete bitmap configuration', () => {
      const data = {
        color: '#FF00FF',
        reset: true,
        centerX: 0,
        centerY: 100,
        duration: 1000,
        image: ['XXX', ' X ', 'XXX'],
      };

      const result = bitmapSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.color).toBe('#FF00FF');
        expect(result.data.image).toEqual(['XXX', ' X ', 'XXX']);
      }
    });
  });

  describe('centerX/centerY validation', () => {
    it('should accept random as centerX', () => {
      const result = bitmapSchema.safeParse({ centerX: 'random' });
      expect(result.success).toBe(true);
    });

    it('should accept random as centerY', () => {
      const result = bitmapSchema.safeParse({ centerY: 'random' });
      expect(result.success).toBe(true);
    });

    it('should accept numeric values', () => {
      const result = bitmapSchema.safeParse({ centerX: 0, centerY: 100 });
      expect(result.success).toBe(true);
    });

    it('should reject non-random string', () => {
      const result = bitmapSchema.safeParse({ centerX: 'left' });
      expect(result.success).toBe(false);
    });
  });

  describe('duration validation', () => {
    it('should reject zero duration', () => {
      const result = bitmapSchema.safeParse({ duration: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative duration', () => {
      const result = bitmapSchema.safeParse({ duration: -100 });
      expect(result.success).toBe(false);
    });

    it('should accept positive duration', () => {
      const result = bitmapSchema.safeParse({ duration: 100 });
      expect(result.success).toBe(true);
    });
  });

  describe('image validation', () => {
    it('should accept valid image array', () => {
      const result = bitmapSchema.safeParse({
        image: ['X X', ' X ', 'X X'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty image array', () => {
      const result = bitmapSchema.safeParse({ image: [] });
      expect(result.success).toBe(true);
    });

    it('should accept single row image', () => {
      const result = bitmapSchema.safeParse({ image: ['XXXXXXXX'] });
      expect(result.success).toBe(true);
    });

    it('should reject non-string array elements', () => {
      const result = bitmapSchema.safeParse({ image: [123, 456] });
      expect(result.success).toBe(false);
    });

    it('should use default Pac-Man ghost image when not specified', () => {
      const result = bitmapSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.image[0]).toContain('XXXXXX');
        expect(result.data.image).toHaveLength(16);
      }
    });
  });

  describe('strict mode', () => {
    it('should reject unknown properties', () => {
      const result = bitmapSchema.safeParse({
        image: ['XXX'],
        scale: 2,
      });
      expect(result.success).toBe(false);
    });
  });
});
