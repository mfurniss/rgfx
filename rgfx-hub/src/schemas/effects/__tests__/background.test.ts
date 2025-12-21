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
        expect(result.data.enabled).toBe('on');
      }
    });

    it('should accept complete background configuration', () => {
      const data = {
        color: '#0000FF',
        enabled: 'on',
      };

      const result = backgroundSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.color).toBe('#0000FF');
        expect(result.data.enabled).toBe('on');
      }
    });

    it('should accept disabled background without color', () => {
      const data = {
        enabled: 'off',
      };

      const result = backgroundSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.enabled).toBe('off');
      }
    });

    it('should accept disabled background with color', () => {
      const data = {
        color: 'blue',
        enabled: 'off',
      };

      const result = backgroundSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.enabled).toBe('off');
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
    it('should accept enabled: off', () => {
      const result = backgroundSchema.safeParse({ enabled: 'off' });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.enabled).toBe('off');
      }
    });

    it('should accept enabled: on', () => {
      const result = backgroundSchema.safeParse({ enabled: 'on' });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.enabled).toBe('on');
      }
    });

    it('should accept enabled: fadeIn', () => {
      const result = backgroundSchema.safeParse({ enabled: 'fadeIn' });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.enabled).toBe('fadeIn');
      }
    });

    it('should accept enabled: fadeOut', () => {
      const result = backgroundSchema.safeParse({ enabled: 'fadeOut' });
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.enabled).toBe('fadeOut');
      }
    });

    it('should reject invalid enabled string', () => {
      const result = backgroundSchema.safeParse({ enabled: 'yes' });
      expect(result.success).toBe(false);
    });

    it('should reject boolean enabled', () => {
      const result = backgroundSchema.safeParse({ enabled: true });
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
