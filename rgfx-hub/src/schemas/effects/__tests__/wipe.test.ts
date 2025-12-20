/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { effectPropsSchemas } from '../index';

const wipeSchema = effectPropsSchemas.wipe;

describe('wipeSchema', () => {
  describe('valid data', () => {
    it('should accept empty object with all defaults', () => {
      const result = wipeSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.color).toBe('random');
        expect(result.data.reset).toBe(false);
        expect(result.data.direction).toBe('random');
        expect(result.data.duration).toBe(500);
      }
    });

    it('should accept complete wipe configuration', () => {
      const data = {
        color: 'blue',
        reset: true,
        direction: 'left',
        duration: 300,
      };

      const result = wipeSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.color).toBe('blue');
        expect(result.data.direction).toBe('left');
      }
    });
  });

  describe('direction validation', () => {
    const validDirections = ['left', 'right', 'up', 'down', 'random'];

    it.each(validDirections)('should accept %s direction', (direction) => {
      const result = wipeSchema.safeParse({ direction });
      expect(result.success).toBe(true);
    });

    it('should reject invalid direction', () => {
      const result = wipeSchema.safeParse({ direction: 'diagonal' });
      expect(result.success).toBe(false);
    });

    it('should reject uppercase direction', () => {
      const result = wipeSchema.safeParse({ direction: 'LEFT' });
      expect(result.success).toBe(false);
    });
  });

  describe('duration validation', () => {
    it('should reject zero duration', () => {
      const result = wipeSchema.safeParse({ duration: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject negative duration', () => {
      const result = wipeSchema.safeParse({ duration: -100 });
      expect(result.success).toBe(false);
    });

    it('should accept positive duration', () => {
      const result = wipeSchema.safeParse({ duration: 250 });
      expect(result.success).toBe(true);
    });
  });

  describe('strict mode', () => {
    it('should reject unknown properties', () => {
      const result = wipeSchema.safeParse({
        direction: 'left',
        speed: 100,
      });
      expect(result.success).toBe(false);
    });
  });
});
