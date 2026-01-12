/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { effectPropsSchemas } from '../index';

const backgroundSchema = effectPropsSchemas.background;

describe('backgroundSchema', () => {
  describe('valid data', () => {
    it('should accept single color gradient', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['#FF0000'] },
      });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.gradient.colors).toEqual(['#FF0000']);
        expect(result.data.gradient.orientation).toBe('horizontal');
        expect(result.data.fadeDuration).toBe(1000);
      }
    });

    it('should accept multi-color gradient', () => {
      const data = {
        gradient: {
          colors: ['#FF0000', '#00FF00', '#0000FF'],
          orientation: 'vertical' as const,
        },
        fadeDuration: 2000,
      };

      const result = backgroundSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.gradient.colors).toEqual(['#FF0000', '#00FF00', '#0000FF']);
        expect(result.data.gradient.orientation).toBe('vertical');
        expect(result.data.fadeDuration).toBe(2000);
      }
    });

    it('should default orientation to horizontal', () => {
      const data = {
        gradient: { colors: ['#FF0000', '#0000FF'] },
      };

      const result = backgroundSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.gradient.orientation).toBe('horizontal');
      }
    });
  });

  describe('gradient validation', () => {
    it('should accept empty colors array', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: [] },
      });
      expect(result.success).toBe(true);
    });

    it('should use default RGB gradient when not provided', () => {
      const result = backgroundSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.gradient.colors).toEqual(['#FF0000', '#00FF00', '#0000FF']);
        expect(result.data.gradient.orientation).toBe('horizontal');
      }
    });

    it('should accept valid hex colors', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['#AABBCC', '#112233'] },
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid hex colors', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['#GGGGGG'] },
      });
      expect(result.success).toBe(false);
    });

    it('should reject hex colors without hash', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['FF0000'] },
      });
      expect(result.success).toBe(false);
    });

    it('should accept vertical orientation', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['#FF0000'], orientation: 'vertical' },
      });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.gradient.orientation).toBe('vertical');
      }
    });

    it('should reject invalid orientation', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['#FF0000'], orientation: 'diagonal' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('fadeDuration validation', () => {
    it('should accept fadeDuration: 0 (immediate)', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['#FF0000'] },
        fadeDuration: 0,
      });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.fadeDuration).toBe(0);
      }
    });

    it('should accept fadeDuration: 5000', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['#FF0000'] },
        fadeDuration: 5000,
      });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.fadeDuration).toBe(5000);
      }
    });

    it('should accept fadeDuration: 10000 (max)', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['#FF0000'] },
        fadeDuration: 10000,
      });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.fadeDuration).toBe(10000);
      }
    });

    it('should default fadeDuration to 1000', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['#FF0000'] },
      });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.fadeDuration).toBe(1000);
      }
    });

    it('should reject negative fadeDuration', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['#FF0000'] },
        fadeDuration: -100,
      });
      expect(result.success).toBe(false);
    });

    it('should reject fadeDuration > 10000', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['#FF0000'] },
        fadeDuration: 15000,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-integer fadeDuration', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['#FF0000'] },
        fadeDuration: 1000.5,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('strict mode', () => {
    it('should reject unknown properties', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['#FF0000'] },
        unknownProp: 'value',
      });
      expect(result.success).toBe(false);
    });

    it('should reject color property (no longer supported)', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['#FF0000'] },
        color: 'red',
      });
      expect(result.success).toBe(false);
    });

    it('should reject reset property (not supported for background)', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['#FF0000'] },
        reset: true,
      });
      expect(result.success).toBe(false);
    });

    it('should reject enabled property (no longer supported)', () => {
      const result = backgroundSchema.safeParse({
        gradient: { colors: ['#FF0000'] },
        enabled: 'on',
      });
      expect(result.success).toBe(false);
    });
  });
});
