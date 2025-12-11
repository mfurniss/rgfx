/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import easingSchema from '../../properties/easing';

describe('easingSchema', () => {
  describe('required field', () => {
    it('should reject undefined (no default - effects define their own)', () => {
      const result = easingSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });
  });

  describe('valid easing functions', () => {
    const validEasings = [
      'linear',
      'quadraticIn',
      'quadraticOut',
      'quadraticInOut',
      'cubicIn',
      'cubicOut',
      'cubicInOut',
      'quarticIn',
      'quarticOut',
      'quarticInOut',
      'quinticIn',
      'quinticOut',
      'quinticInOut',
      'sineIn',
      'sineOut',
      'sineInOut',
      'circularIn',
      'circularOut',
      'circularInOut',
      'exponentialIn',
      'exponentialOut',
      'exponentialInOut',
      'elasticIn',
      'elasticOut',
      'elasticInOut',
      'backIn',
      'backOut',
      'backInOut',
      'bounceIn',
      'bounceOut',
      'bounceInOut',
    ];

    it.each(validEasings)('should accept easing: %s', (easing) => {
      const result = easingSchema.safeParse(easing);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid values', () => {
    it('should reject unknown easing name', () => {
      const result = easingSchema.safeParse('easeIn');
      expect(result.success).toBe(false);
    });

    it('should reject uppercase easing', () => {
      const result = easingSchema.safeParse('LINEAR');
      expect(result.success).toBe(false);
    });

    it('should reject CSS-style easing', () => {
      const result = easingSchema.safeParse('ease-in-out');
      expect(result.success).toBe(false);
    });

    it('should reject number', () => {
      const result = easingSchema.safeParse(0.5);
      expect(result.success).toBe(false);
    });

    it('should reject cubic bezier array', () => {
      const result = easingSchema.safeParse([0.4, 0, 0.2, 1]);
      expect(result.success).toBe(false);
    });
  });
});
