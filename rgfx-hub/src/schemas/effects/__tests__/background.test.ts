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
    it('should accept empty object with all defaults', () => {
      const result = backgroundSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.color).toBe('random');
        expect(result.data.enabled).toBe(true);
      }
    });

    it('should accept complete background configuration', () => {
      const data = {
        color: '#0000FF',
        enabled: true,
      };

      const result = backgroundSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.color).toBe('#0000FF');
        expect(result.data.enabled).toBe(true);
      }
    });

    it('should accept disabled background without color', () => {
      const data = {
        enabled: false,
      };

      const result = backgroundSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.enabled).toBe(false);
      }
    });

    it('should accept disabled background with color', () => {
      const data = {
        color: 'blue',
        enabled: false,
      };

      const result = backgroundSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.enabled).toBe(false);
        expect(result.data.color).toBe('blue');
      }
    });
  });

  describe('color validation', () => {
    it('should accept hex color string with hash', () => {
      const result = backgroundSchema.safeParse({ color: '#FF0000' });
      expect(result.success).toBe(true);
    });

    it('should accept hex color string without hash', () => {
      const result = backgroundSchema.safeParse({ color: 'FF0000' });
      expect(result.success).toBe(true);
    });

    it('should accept named color', () => {
      const result = backgroundSchema.safeParse({ color: 'blue' });
      expect(result.success).toBe(true);
    });

    it('should accept numeric color', () => {
      const result = backgroundSchema.safeParse({ color: 0x0000ff });
      expect(result.success).toBe(true);
    });

    it('should reject invalid hex color', () => {
      const result = backgroundSchema.safeParse({ color: '#GGGGGG' });
      expect(result.success).toBe(false);
    });

    it('should accept random as color', () => {
      const result = backgroundSchema.safeParse({ color: 'random' });
      expect(result.success).toBe(true);
    });
  });

  describe('enabled validation', () => {
    it('should accept boolean true', () => {
      const result = backgroundSchema.safeParse({ enabled: true });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.enabled).toBe(true);
      }
    });

    it('should accept boolean false', () => {
      const result = backgroundSchema.safeParse({ enabled: false });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.enabled).toBe(false);
      }
    });

    it('should reject non-boolean enabled', () => {
      const result = backgroundSchema.safeParse({ enabled: 'yes' });
      expect(result.success).toBe(false);
    });

    it('should reject numeric enabled', () => {
      const result = backgroundSchema.safeParse({ enabled: 1 });
      expect(result.success).toBe(false);
    });
  });

  describe('strict mode', () => {
    it('should reject unknown properties', () => {
      const result = backgroundSchema.safeParse({
        color: 'red',
        unknownProp: 'value',
      });
      expect(result.success).toBe(false);
    });

    it('should reject reset property (not supported for background)', () => {
      const result = backgroundSchema.safeParse({
        color: 'red',
        reset: true,
      });
      expect(result.success).toBe(false);
    });

    it('should reject duration property (not supported for background)', () => {
      const result = backgroundSchema.safeParse({
        color: 'red',
        duration: 1000,
      });
      expect(result.success).toBe(false);
    });
  });
});
