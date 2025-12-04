/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import pulseSchema from '../pulse';

describe('pulseSchema', () => {
  describe('valid data', () => {
    it('should accept empty object with all defaults', () => {
      const result = pulseSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.color).toBe('random');
        expect(result.data.reset).toBe(false);
        expect(result.data.duration).toBe(700);
        expect(result.data.easing).toBe('quadraticOut');
        expect(result.data.fade).toBe(true);
        expect(result.data.collapse).toBe('horizontal');
      }
    });

    it('should accept complete pulse configuration', () => {
      const data = {
        color: '#FF0000',
        reset: true,
        duration: 500,
        easing: 'linear',
        fade: false,
        collapse: 'vertical',
      };

      const result = pulseSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.color).toBe('#FF0000');
        expect(result.data.duration).toBe(500);
        expect(result.data.collapse).toBe('vertical');
      }
    });
  });

  describe('duration validation', () => {
    it('should reject zero duration', () => {
      const result = pulseSchema.safeParse({ duration: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative duration', () => {
      const result = pulseSchema.safeParse({ duration: -100 });
      expect(result.success).toBe(false);
    });

    it('should accept small positive duration', () => {
      const result = pulseSchema.safeParse({ duration: 1 });
      expect(result.success).toBe(true);
    });

    it('should accept large duration', () => {
      const result = pulseSchema.safeParse({ duration: 10000 });
      expect(result.success).toBe(true);
    });
  });

  describe('collapse validation', () => {
    it('should accept horizontal collapse', () => {
      const result = pulseSchema.safeParse({ collapse: 'horizontal' });
      expect(result.success).toBe(true);
    });

    it('should accept vertical collapse', () => {
      const result = pulseSchema.safeParse({ collapse: 'vertical' });
      expect(result.success).toBe(true);
    });

    it('should accept none collapse', () => {
      const result = pulseSchema.safeParse({ collapse: 'none' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid collapse direction', () => {
      const result = pulseSchema.safeParse({ collapse: 'diagonal' });
      expect(result.success).toBe(false);
    });
  });

  describe('fade validation', () => {
    it('should accept boolean fade', () => {
      const trueResult = pulseSchema.safeParse({ fade: true });
      const falseResult = pulseSchema.safeParse({ fade: false });
      expect(trueResult.success).toBe(true);
      expect(falseResult.success).toBe(true);
    });

    it('should reject non-boolean fade', () => {
      const result = pulseSchema.safeParse({ fade: 'yes' });
      expect(result.success).toBe(false);
    });
  });

  describe('strict mode', () => {
    it('should reject unknown properties', () => {
      const result = pulseSchema.safeParse({
        color: 'red',
        unknownProp: 'value',
      });
      expect(result.success).toBe(false);
    });
  });
});
