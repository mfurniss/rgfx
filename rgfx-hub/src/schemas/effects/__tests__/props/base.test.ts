/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import baseEffect from '../../properties/base';

describe('baseEffect schema', () => {
  describe('default values', () => {
    it('should apply defaults for empty object', () => {
      const result = baseEffect.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.color).toBe('random');
        expect(result.data.reset).toBe(false);
      }
    });
  });

  describe('color property', () => {
    it('should accept named color', () => {
      const result = baseEffect.safeParse({ color: 'red' });
      expect(result.success).toBe(true);
    });

    it('should accept hex color', () => {
      const result = baseEffect.safeParse({ color: '#FF0000' });
      expect(result.success).toBe(true);
    });

    it('should accept numeric color', () => {
      const result = baseEffect.safeParse({ color: 0xff0000 });
      expect(result.success).toBe(true);
    });
  });

  describe('reset property', () => {
    it('should accept true', () => {
      const result = baseEffect.safeParse({ reset: true });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.reset).toBe(true);
      }
    });

    it('should accept false', () => {
      const result = baseEffect.safeParse({ reset: false });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.reset).toBe(false);
      }
    });

    it('should reject non-boolean', () => {
      const result = baseEffect.safeParse({ reset: 'true' });
      expect(result.success).toBe(false);
    });

    it('should reject number', () => {
      const result = baseEffect.safeParse({ reset: 1 });
      expect(result.success).toBe(false);
    });
  });

  describe('combined properties', () => {
    it('should accept both color and reset', () => {
      const result = baseEffect.safeParse({ color: 'blue', reset: true });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.color).toBe('blue');
        expect(result.data.reset).toBe(true);
      }
    });
  });
});
