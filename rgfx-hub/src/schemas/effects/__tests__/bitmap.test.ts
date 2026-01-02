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
        expect(result.data.endX).toBe('random');
        expect(result.data.endY).toBe('random');
        expect(result.data.duration).toBe(1500);
        expect(result.data.easing).toBe('quadraticInOut');
        expect(result.data.fadeIn).toBe(300);
        expect(result.data.fadeOut).toBe(300);
        expect(result.data.frameRate).toBe(2);
        expect(result.data.images).toHaveLength(1);
        expect(result.data.images[0]).toHaveLength(16);
        expect(result.data.palette).toHaveLength(16);
      }
    });

    it('should accept complete bitmap configuration', () => {
      const data = {
        reset: true,
        centerX: 0,
        centerY: 100,
        duration: 1000,
        frameRate: 4,
        images: [['ABC', ' B ', 'ABC']],
      };

      const result = bitmapSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.images).toEqual([['ABC', ' B ', 'ABC']]);
        expect(result.data.frameRate).toBe(4);
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

  describe('endX/endY validation', () => {
    it('should accept random as endX', () => {
      const result = bitmapSchema.safeParse({ endX: 'random' });
      expect(result.success).toBe(true);
    });

    it('should accept random as endY', () => {
      const result = bitmapSchema.safeParse({ endY: 'random' });
      expect(result.success).toBe(true);
    });

    it('should accept numeric endX/endY values', () => {
      const result = bitmapSchema.safeParse({ endX: 0, endY: 100 });
      expect(result.success).toBe(true);
    });

    it('should accept endX override while endY uses default', () => {
      const result = bitmapSchema.safeParse({ endX: 50 });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.endX).toBe(50);
        expect(result.data.endY).toBe('random');
      }
    });

    it('should accept endY override while endX uses default', () => {
      const result = bitmapSchema.safeParse({ endY: 50 });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.endX).toBe('random');
        expect(result.data.endY).toBe(50);
      }
    });

    it('should reject non-random string for endX', () => {
      const result = bitmapSchema.safeParse({ endX: 'left' });
      expect(result.success).toBe(false);
    });
  });

  describe('easing validation', () => {
    it('should default to quadraticInOut', () => {
      const result = bitmapSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.easing).toBe('quadraticInOut');
      }
    });

    it('should accept valid easing values', () => {
      const easings = ['linear', 'quadraticIn', 'quadraticOut', 'bounceOut'];

      for (const easing of easings) {
        const result = bitmapSchema.safeParse({ easing });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid easing value', () => {
      const result = bitmapSchema.safeParse({ easing: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('fadeIn/fadeOut validation', () => {
    it('should default fadeIn to 300', () => {
      const result = bitmapSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.fadeIn).toBe(300);
      }
    });

    it('should default fadeOut to 300', () => {
      const result = bitmapSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.fadeOut).toBe(300);
      }
    });

    it('should accept zero for fadeIn (disabled)', () => {
      const result = bitmapSchema.safeParse({ fadeIn: 0 });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.fadeIn).toBe(0);
      }
    });

    it('should accept zero for fadeOut (disabled)', () => {
      const result = bitmapSchema.safeParse({ fadeOut: 0 });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.fadeOut).toBe(0);
      }
    });

    it('should reject negative fadeIn', () => {
      const result = bitmapSchema.safeParse({ fadeIn: -100 });
      expect(result.success).toBe(false);
    });

    it('should reject negative fadeOut', () => {
      const result = bitmapSchema.safeParse({ fadeOut: -100 });
      expect(result.success).toBe(false);
    });

    it('should accept custom fade durations', () => {
      const result = bitmapSchema.safeParse({ fadeIn: 500, fadeOut: 1000 });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.fadeIn).toBe(500);
        expect(result.data.fadeOut).toBe(1000);
      }
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

  describe('images validation', () => {
    it('should accept single frame array', () => {
      const result = bitmapSchema.safeParse({
        images: [['A B', ' A ', 'A B']],
      });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.images).toHaveLength(1);
        expect(result.data.images[0]).toEqual(['A B', ' A ', 'A B']);
      }
    });

    it('should accept multiple frames', () => {
      const result = bitmapSchema.safeParse({
        images: [
          ['ABC', 'DEF'],
          ['123', '456'],
        ],
      });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.images).toHaveLength(2);
      }
    });

    it('should accept frames with different sizes', () => {
      const result = bitmapSchema.safeParse({
        images: [
          ['A', 'B'],
          ['ABCDEF', 'GHIJKL'],
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept empty images array', () => {
      const result = bitmapSchema.safeParse({ images: [] });
      expect(result.success).toBe(true);
    });

    it('should accept single row frame', () => {
      const result = bitmapSchema.safeParse({ images: [['ABCDEF01']] });
      expect(result.success).toBe(true);
    });

    it('should reject non-string array elements in frame', () => {
      const result = bitmapSchema.safeParse({ images: [[123, 456]] });
      expect(result.success).toBe(false);
    });

    it('should use default Bub sprite wrapped in array when not specified', () => {
      const result = bitmapSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.images).toHaveLength(1);
        expect(result.data.images[0]).toHaveLength(16);
        expect(result.data.images[0][0]).toContain('A');
      }
    });
  });

  describe('frameRate validation', () => {
    it('should default to 2 FPS', () => {
      const result = bitmapSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.frameRate).toBe(2);
      }
    });

    it('should accept custom frame rate', () => {
      const result = bitmapSchema.safeParse({ frameRate: 10 });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.frameRate).toBe(10);
      }
    });

    it('should reject zero frame rate', () => {
      const result = bitmapSchema.safeParse({ frameRate: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative frame rate', () => {
      const result = bitmapSchema.safeParse({ frameRate: -1 });
      expect(result.success).toBe(false);
    });

    it('should accept fractional frame rate', () => {
      const result = bitmapSchema.safeParse({ frameRate: 0.5 });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.frameRate).toBe(0.5);
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
        images: [['ABC']],
        scale: 2,
      });
      expect(result.success).toBe(false);
    });
  });
});
