/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { effectPropsSchemas } from '../index';

const bitmapSchema = effectPropsSchemas.bitmap;

describe('bitmapSchema', () => {
  describe('valid data', () => {
    it('should accept empty object with all defaults', () => {
      const result = bitmapSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.reset).toBe(false);
        expect(result.data.centerX).toBe('random');
        expect(result.data.centerY).toBe('random');
        expect(result.data.duration).toBe(600);
        expect(result.data.image).toHaveLength(16);
        expect(result.data.palette).toHaveLength(16);
      }
    });

    it('should accept complete bitmap configuration', () => {
      const data = {
        reset: true,
        centerX: 0,
        centerY: 100,
        duration: 1000,
        image: ['ABC', ' B ', 'ABC'],
      };

      const result = bitmapSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.image).toEqual(['ABC', ' B ', 'ABC']);
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
        image: ['A B', ' A ', 'A B'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty image array', () => {
      const result = bitmapSchema.safeParse({ image: [] });
      expect(result.success).toBe(true);
    });

    it('should accept single row image', () => {
      const result = bitmapSchema.safeParse({ image: ['ABCDEF01'] });
      expect(result.success).toBe(true);
    });

    it('should reject non-string array elements', () => {
      const result = bitmapSchema.safeParse({ image: [123, 456] });
      expect(result.success).toBe(false);
    });

    it('should use default Bub sprite image when not specified', () => {
      const result = bitmapSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.image[0]).toContain('A');
        expect(result.data.image).toHaveLength(16);
      }
    });
  });

  describe('palette validation', () => {
    it('should accept custom palette', () => {
      const result = bitmapSchema.safeParse({
        palette: ['#FF0000', '#00FF00', '#0000FF'],
      });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.palette).toEqual(['#FF0000', '#00FF00', '#0000FF']);
      }
    });

    it('should use PICO-8 palette by default', () => {
      const result = bitmapSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.palette).toHaveLength(16);
        expect(result.data.palette[0]).toBe('#000000'); // Black
        expect(result.data.palette[8]).toBe('#FF004D'); // Red
      }
    });

    it('should reject palette with more than 16 colors', () => {
      const result = bitmapSchema.safeParse({
        palette: Array(17).fill('#FFFFFF'),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid hex color format', () => {
      const result = bitmapSchema.safeParse({
        palette: ['not-a-color'],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('strict mode', () => {
    it('should reject unknown properties', () => {
      const result = bitmapSchema.safeParse({
        image: ['ABC'],
        scale: 2,
      });
      expect(result.success).toBe(false);
    });
  });
});
