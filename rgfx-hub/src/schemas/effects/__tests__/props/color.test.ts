/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import colorSchema from '../../properties/color';

describe('colorSchema', () => {
  describe('default value', () => {
    it('should default to random when undefined', () => {
      const result = colorSchema.safeParse(undefined);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data).toBe('random');
      }
    });
  });

  describe('named colors', () => {
    const validColors = [
      'random',
      'red',
      'green',
      'blue',
      'white',
      'black',
      'yellow',
      'cyan',
      'magenta',
      'orange',
      'purple',
      'pink',
      'lime',
      'aqua',
      'navy',
      'teal',
      'olive',
      'maroon',
      'silver',
      'gray',
      'grey',
    ];

    it.each(validColors)('should accept named color: %s', (color) => {
      const result = colorSchema.safeParse(color);
      expect(result.success).toBe(true);
    });

    it('should reject unknown named color', () => {
      const result = colorSchema.safeParse('chartreuse');
      expect(result.success).toBe(false);
    });

    it('should reject uppercase named color', () => {
      const result = colorSchema.safeParse('RED');
      expect(result.success).toBe(false);
    });
  });

  describe('hex colors', () => {
    it('should accept hex color with # prefix', () => {
      const result = colorSchema.safeParse('#FF0000');
      expect(result.success).toBe(true);
    });

    it('should accept hex color without # prefix', () => {
      const result = colorSchema.safeParse('00FF00');
      expect(result.success).toBe(true);
    });

    it('should accept lowercase hex', () => {
      const result = colorSchema.safeParse('#aabbcc');
      expect(result.success).toBe(true);
    });

    it('should accept mixed case hex', () => {
      const result = colorSchema.safeParse('#AaBbCc');
      expect(result.success).toBe(true);
    });

    it('should reject 3-digit hex shorthand', () => {
      const result = colorSchema.safeParse('#FFF');
      expect(result.success).toBe(false);
    });

    it('should reject 8-digit hex with alpha', () => {
      const result = colorSchema.safeParse('#FF0000FF');
      expect(result.success).toBe(false);
    });

    it('should reject invalid hex characters', () => {
      const result = colorSchema.safeParse('#GGHHII');
      expect(result.success).toBe(false);
    });
  });

  describe('numeric RGB', () => {
    it('should accept 0 (black)', () => {
      const result = colorSchema.safeParse(0);
      expect(result.success).toBe(true);
    });

    it('should accept max value (white)', () => {
      const result = colorSchema.safeParse(0xffffff);
      expect(result.success).toBe(true);
    });

    it('should accept typical RGB value', () => {
      const result = colorSchema.safeParse(0xff0000); // red
      expect(result.success).toBe(true);
    });

    it('should reject negative numbers', () => {
      const result = colorSchema.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it('should reject values above 0xFFFFFF', () => {
      const result = colorSchema.safeParse(0x1000000);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer', () => {
      const result = colorSchema.safeParse(255.5);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid types', () => {
    it('should reject boolean', () => {
      const result = colorSchema.safeParse(true);
      expect(result.success).toBe(false);
    });

    it('should reject object', () => {
      const result = colorSchema.safeParse({ r: 255, g: 0, b: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject array', () => {
      const result = colorSchema.safeParse([255, 0, 0]);
      expect(result.success).toBe(false);
    });
  });
});
