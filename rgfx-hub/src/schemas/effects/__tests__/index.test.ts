/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { effectSchemas, isEffectName, safeValidateEffectProps } from '../index';
import { MAX_GRADIENT_COLORS } from '@/config/constants';

describe('effectSchemas', () => {
  it('should export all effect schemas', () => {
    expect(effectSchemas).toHaveProperty('pulse');
    expect(effectSchemas).toHaveProperty('wipe');
    expect(effectSchemas).toHaveProperty('explode');
    expect(effectSchemas).toHaveProperty('bitmap');
  });
});

describe('isEffectName', () => {
  it('should return true for valid effect names', () => {
    expect(isEffectName('pulse')).toBe(true);
    expect(isEffectName('wipe')).toBe(true);
    expect(isEffectName('explode')).toBe(true);
    expect(isEffectName('bitmap')).toBe(true);
  });

  it('should return false for invalid effect names', () => {
    expect(isEffectName('flash')).toBe(false);
    expect(isEffectName('fade')).toBe(false);
    expect(isEffectName('')).toBe(false);
    expect(isEffectName('PULSE')).toBe(false);
  });
});

describe('safeValidateEffectProps', () => {
  describe('valid effects', () => {
    it('should validate pulse props', () => {
      const result = safeValidateEffectProps('pulse', { color: 'red', duration: 500 });
      expect(result.success).toBe(true);

      if (result.success) {
        expect((result.data as { color: string }).color).toBe('red');
      }
    });

    it('should validate wipe props', () => {
      const result = safeValidateEffectProps('wipe', { direction: 'left' });
      expect(result.success).toBe(true);

      if (result.success) {
        expect((result.data as { direction: string }).direction).toBe('left');
      }
    });

    it('should validate explode props', () => {
      const result = safeValidateEffectProps('explode', { particleCount: 50 });
      expect(result.success).toBe(true);

      if (result.success) {
        expect((result.data as { particleCount: number }).particleCount).toBe(50);
      }
    });

    it('should validate bitmap props', () => {
      const result = safeValidateEffectProps('bitmap', { images: [['AAA']] });
      expect(result.success).toBe(true);

      if (result.success) {
        expect((result.data as { images: string[][] }).images).toEqual([['AAA']]);
      }
    });

    it('should apply defaults for empty props', () => {
      const result = safeValidateEffectProps('pulse', {});
      expect(result.success).toBe(true);

      if (result.success) {
        expect((result.data as { color: string }).color).toBe('random');
        expect((result.data as { duration: number }).duration).toBe(800);
      }
    });
  });

  describe('invalid effects', () => {
    it('should fail for unknown effect type', () => {
      const result = safeValidateEffectProps('flash', { color: 'red' });
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Unknown effect type');
      }
    });

    it('should fail for invalid props', () => {
      const result = safeValidateEffectProps('pulse', { duration: -100 });
      expect(result.success).toBe(false);
    });

    it('should fail for unknown props due to strict mode', () => {
      const result = safeValidateEffectProps('pulse', { unknownProp: 'value' });
      expect(result.success).toBe(false);
    });
  });

  describe('plasma gradient limits', () => {
    it('should accept gradient with MAX_GRADIENT_COLORS colors', () => {
      const colors = Array(MAX_GRADIENT_COLORS).fill('#FF0000');
      const result = safeValidateEffectProps('plasma', { gradient: colors });
      expect(result.success).toBe(true);
    });

    it('should reject gradient exceeding MAX_GRADIENT_COLORS', () => {
      const colors = Array(MAX_GRADIENT_COLORS + 1).fill('#FF0000');
      const result = safeValidateEffectProps('plasma', { gradient: colors });
      expect(result.success).toBe(false);
    });

    it('should accept gradient with single color', () => {
      const result = safeValidateEffectProps('plasma', { gradient: ['#FF0000'] });
      expect(result.success).toBe(true);
    });
  });

  describe('text effect gradient consolidation', () => {
    it('should require gradient with at least 1 color for text effect', () => {
      const result = safeValidateEffectProps('text', { gradient: ['#FFA000'] });
      expect(result.success).toBe(true);

      if (result.success) {
        expect((result.data as { gradient: string[] }).gradient).toEqual(['#FFA000']);
      }
    });

    it('should apply default gradient for text effect when not provided', () => {
      const result = safeValidateEffectProps('text', {});
      expect(result.success).toBe(true);

      if (result.success) {
        expect((result.data as { gradient: string[] }).gradient).toEqual(['#FFA000']);
      }
    });

    it('should reject empty gradient array for text effect', () => {
      const result = safeValidateEffectProps('text', { gradient: [] });
      expect(result.success).toBe(false);
    });

    it('should reject non-array gradient for text effect', () => {
      const result = safeValidateEffectProps('text', { gradient: '#FFA000' });
      expect(result.success).toBe(false);
    });

    it('should reject color prop for text effect (strict mode)', () => {
      const result = safeValidateEffectProps('text', { color: '#FFA000' });
      expect(result.success).toBe(false);
    });
  });

  describe('scroll_text effect gradient consolidation', () => {
    it('should require gradient with at least 1 color for scroll_text effect', () => {
      const result = safeValidateEffectProps('scroll_text', { gradient: ['#E0E000'] });
      expect(result.success).toBe(true);

      if (result.success) {
        expect((result.data as { gradient: string[] }).gradient).toEqual(['#E0E000']);
      }
    });

    it('should apply default gradient for scroll_text effect when not provided', () => {
      const result = safeValidateEffectProps('scroll_text', {});
      expect(result.success).toBe(true);

      if (result.success) {
        expect((result.data as { gradient: string[] }).gradient).toEqual(['#E0E000']);
      }
    });

    it('should reject empty gradient array for scroll_text effect', () => {
      const result = safeValidateEffectProps('scroll_text', { gradient: [] });
      expect(result.success).toBe(false);
    });

    it('should reject non-array gradient for scroll_text effect', () => {
      const result = safeValidateEffectProps('scroll_text', { gradient: '#E0E000' });
      expect(result.success).toBe(false);
    });

    it('should reject color prop for scroll_text effect (strict mode)', () => {
      const result = safeValidateEffectProps('scroll_text', { color: '#E0E000' });
      expect(result.success).toBe(false);
    });

    it('should accept multi-color gradient for scroll_text animation', () => {
      const result = safeValidateEffectProps('scroll_text', {
        gradient: ['#FF0000', '#00FF00', '#0000FF'],
        gradientSpeed: 5,
        gradientScale: 2,
      });
      expect(result.success).toBe(true);

      if (result.success) {
        const data = result.data as { gradient: string[]; gradientSpeed: number };
        expect(data.gradient).toHaveLength(3);
        expect(data.gradientSpeed).toBe(5);
      }
    });
  });
});
