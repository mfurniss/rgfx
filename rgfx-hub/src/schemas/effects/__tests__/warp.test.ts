import { describe, it, expect } from 'vitest';
import { effectPropsSchemas } from '../index';
import { randomize, presetConfig, fieldTypes } from '../warp';

const warpSchema = effectPropsSchemas.warp;

describe('warpSchema', () => {
  describe('valid data', () => {
    it('should accept empty object with all defaults', () => {
      const result = warpSchema.safeParse({});
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.enabled).toBe('fadeIn');
        expect(result.data.speed).toBe(2.5);
        expect(result.data.scale).toBe(3);
        expect(result.data.orientation).toBe('horizontal');
        expect(result.data.gradient).toEqual(['#FFFF00', '#00FFFF', '#0000FF', '#FFFF00']);
      }
    });

    it('should accept complete warp configuration', () => {
      const data = {
        enabled: 'on',
        speed: -5,
        scale: 0,
        orientation: 'vertical',
        gradient: ['#FF0000', '#00FF00'],
      };

      const result = warpSchema.safeParse(data);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data.enabled).toBe('on');
        expect(result.data.speed).toBe(-5);
        expect(result.data.scale).toBe(0);
        expect(result.data.orientation).toBe('vertical');
        expect(result.data.gradient).toEqual(['#FF0000', '#00FF00']);
      }
    });

    it('should accept all enabled states', () => {
      for (const state of ['off', 'on', 'fadeIn', 'fadeOut']) {
        const result = warpSchema.safeParse({ enabled: state });
        expect(result.success).toBe(true);
      }
    });

    it('should accept boundary speed values', () => {
      expect(warpSchema.safeParse({ speed: -50 }).success).toBe(true);
      expect(warpSchema.safeParse({ speed: 50 }).success).toBe(true);
      expect(warpSchema.safeParse({ speed: 0 }).success).toBe(true);
    });

    it('should accept boundary scale values', () => {
      expect(warpSchema.safeParse({ scale: -10 }).success).toBe(true);
      expect(warpSchema.safeParse({ scale: 10 }).success).toBe(true);
    });
  });

  describe('invalid data', () => {
    it('should reject speed out of range', () => {
      expect(warpSchema.safeParse({ speed: -51 }).success).toBe(false);
      expect(warpSchema.safeParse({ speed: 51 }).success).toBe(false);
    });

    it('should reject scale out of range', () => {
      expect(warpSchema.safeParse({ scale: -11 }).success).toBe(false);
      expect(warpSchema.safeParse({ scale: 11 }).success).toBe(false);
    });

    it('should reject invalid enabled state', () => {
      expect(warpSchema.safeParse({ enabled: 'blink' }).success).toBe(false);
    });

    it('should reject invalid orientation', () => {
      expect(warpSchema.safeParse({ orientation: 'diagonal' }).success).toBe(false);
    });

    it('should reject invalid gradient colors', () => {
      expect(warpSchema.safeParse({ gradient: ['not-a-color'] }).success).toBe(false);
    });
  });

  describe('randomize', () => {
    it('should return valid props', () => {
      const props = randomize();
      expect(typeof props.speed).toBe('number');
      expect(typeof props.scale).toBe('number');
      expect(props.enabled).toBe('fadeIn');
      expect(['horizontal', 'vertical']).toContain(props.orientation);
      expect(Array.isArray(props.gradient)).toBe(true);
    });

    it('should produce props that validate against schema', () => {
      const props = randomize();
      const result = warpSchema.safeParse(props);
      expect(result.success).toBe(true);
    });
  });

  describe('presetConfig', () => {
    it('should have type "plasma"', () => {
      expect(presetConfig.type).toBe('plasma');
    });

    it('should apply gradient, speed, and scale from data', () => {
      const data = { gradient: ['#FF0000'], speed: 5, scale: 2 };
      const values = { enabled: 'on' };

      const result = presetConfig.apply(data, values);

      expect(result).toEqual({
        enabled: 'on',
        gradient: ['#FF0000'],
        speed: 5,
        scale: 2,
      });
    });
  });

  describe('fieldTypes', () => {
    it('should map gradient to gradientArray', () => {
      expect(fieldTypes.gradient).toBe('gradientArray');
    });
  });
});
