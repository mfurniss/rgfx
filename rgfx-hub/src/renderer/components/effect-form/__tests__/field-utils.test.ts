import { describe, it, expect } from 'vitest';
import { formatLabel, formatConstraintHint, buildTooltip } from '../field-utils';

describe('field-utils', () => {
  describe('formatLabel', () => {
    it('converts camelCase to Title Case', () => {
      expect(formatLabel('particleCount')).toBe('Particle Count');
      expect(formatLabel('hueSpread')).toBe('Hue Spread');
      expect(formatLabel('fadeSpeed')).toBe('Fade Speed');
    });

    it('capitalizes single word names', () => {
      expect(formatLabel('color')).toBe('Color');
      expect(formatLabel('speed')).toBe('Speed');
    });

    it('uses override for known field names', () => {
      expect(formatLabel('gradient')).toBe('Gradient');
      expect(formatLabel('orientation')).toBe('Gradient Orientation');
      expect(formatLabel('lifespanSpread')).toBe('Lifespan Spread %');
      expect(formatLabel('powerSpread')).toBe('Power Spread %');
    });

    it('handles empty string', () => {
      expect(formatLabel('')).toBe('');
    });

    it('handles names starting with uppercase', () => {
      expect(formatLabel('Color')).toBe('Color');
      expect(formatLabel('ParticleCount')).toBe('Particle Count');
    });
  });

  describe('formatConstraintHint', () => {
    it('returns undefined when no constraints provided', () => {
      expect(formatConstraintHint(undefined)).toBeUndefined();
    });

    it('returns undefined when constraints object is empty', () => {
      expect(formatConstraintHint({})).toBeUndefined();
    });

    it('formats range when both min and max provided', () => {
      expect(formatConstraintHint({ min: 0, max: 100 })).toBe('Range: 0 - 100');
      expect(formatConstraintHint({ min: -50, max: 50 })).toBe('Range: -50 - 50');
    });

    it('formats min only when max not provided', () => {
      expect(formatConstraintHint({ min: 0 })).toBe('Min: 0');
      expect(formatConstraintHint({ min: -10 })).toBe('Min: -10');
    });

    it('formats max only when min not provided', () => {
      expect(formatConstraintHint({ max: 100 })).toBe('Max: 100');
      expect(formatConstraintHint({ max: -5 })).toBe('Max: -5');
    });

    it('handles zero values correctly', () => {
      expect(formatConstraintHint({ min: 0, max: 0 })).toBe('Range: 0 - 0');
      expect(formatConstraintHint({ min: 0 })).toBe('Min: 0');
      expect(formatConstraintHint({ max: 0 })).toBe('Max: 0');
    });
  });

  describe('buildTooltip', () => {
    it('returns undefined when no description or default value', () => {
      expect(buildTooltip(undefined, undefined)).toBeUndefined();
    });

    it('returns description only when no default value', () => {
      expect(buildTooltip('A test field', undefined)).toBe('A test field');
    });

    it('returns default value only when no description', () => {
      expect(buildTooltip(undefined, 42)).toBe('Default: 42');
    });

    it('combines description and default value with newline', () => {
      expect(buildTooltip('A test field', 42)).toBe('A test field\nDefault: 42');
    });

    it('formats boolean default values', () => {
      expect(buildTooltip(undefined, true)).toBe('Default: on');
      expect(buildTooltip(undefined, false)).toBe('Default: off');
    });

    it('formats string default values with quotes', () => {
      expect(buildTooltip(undefined, 'random')).toBe('Default: "random"');
      expect(buildTooltip(undefined, 'blue')).toBe('Default: "blue"');
    });

    it('formats number default values', () => {
      expect(buildTooltip(undefined, 100)).toBe('Default: 100');
      expect(buildTooltip(undefined, 0)).toBe('Default: 0');
      expect(buildTooltip(undefined, -5.5)).toBe('Default: -5.5');
    });

    it('formats object default values as JSON', () => {
      expect(buildTooltip(undefined, { a: 1 })).toBe('Default: {"a":1}');
      expect(buildTooltip(undefined, ['red', 'blue'])).toBe('Default: ["red","blue"]');
    });

    it('formats null as none', () => {
      expect(buildTooltip(undefined, null)).toBe('Default: none');
    });
  });
});
