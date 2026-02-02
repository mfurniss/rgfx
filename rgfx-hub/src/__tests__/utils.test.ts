import { describe, it, expect } from 'vitest';
import { hslToHex } from '../utils/color';
import { roundFloat } from '../utils/math';
import { randomInt, randomFloat, randomString, randomColor, randomGradient } from '../utils/random';

describe('color utils', () => {
  describe('hslToHex', () => {
    it('should convert red (h=0)', () => {
      expect(hslToHex(0, 1, 0.5)).toBe('#ff0000');
    });

    it('should convert green (h=120)', () => {
      expect(hslToHex(120, 1, 0.5)).toBe('#00ff00');
    });

    it('should convert blue (h=240)', () => {
      expect(hslToHex(240, 1, 0.5)).toBe('#0000ff');
    });

    it('should convert yellow (h=60)', () => {
      expect(hslToHex(60, 1, 0.5)).toBe('#ffff00');
    });

    it('should convert cyan (h=180)', () => {
      expect(hslToHex(180, 1, 0.5)).toBe('#00ffff');
    });

    it('should convert magenta (h=300)', () => {
      expect(hslToHex(300, 1, 0.5)).toBe('#ff00ff');
    });

    it('should convert white (l=1)', () => {
      expect(hslToHex(0, 0, 1)).toBe('#ffffff');
    });

    it('should convert black (l=0)', () => {
      expect(hslToHex(0, 0, 0)).toBe('#000000');
    });

    it('should convert gray (s=0, l=0.5)', () => {
      expect(hslToHex(0, 0, 0.5)).toBe('#808080');
    });

    it('should handle hue > 300 (pink/red range)', () => {
      const result = hslToHex(330, 1, 0.5);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
      // h=330 should have high red, no green, medium blue
      expect(result.slice(1, 3)).toBe('ff'); // red
      expect(result.slice(3, 5)).toBe('00'); // green
    });

    it('should handle intermediate hue values', () => {
      // h=90 (yellow-green)
      const result90 = hslToHex(90, 1, 0.5);
      expect(result90).toMatch(/^#[0-9a-f]{6}$/);

      // h=150 (green-cyan)
      const result150 = hslToHex(150, 1, 0.5);
      expect(result150).toMatch(/^#[0-9a-f]{6}$/);

      // h=210 (cyan-blue)
      const result210 = hslToHex(210, 1, 0.5);
      expect(result210).toMatch(/^#[0-9a-f]{6}$/);

      // h=270 (blue-magenta)
      const result270 = hslToHex(270, 1, 0.5);
      expect(result270).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should clamp overflow values to valid hex', () => {
      // l=50 instead of 0.5 would cause RGB values > 255 without clamping
      const result = hslToHex(0, 0.5, 50);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
      // Clamped to max, so should be white or near-white
      expect(result).toBe('#ffffff');
    });

    it('should clamp negative values to valid hex', () => {
      // Negative lightness would cause RGB values < 0 without clamping
      const result = hslToHex(0, 0.5, -1);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
      // Clamped to min, so should be black
      expect(result).toBe('#000000');
    });

    it('should clamp extreme saturation values', () => {
      // s=100 instead of 1.0
      const result = hslToHex(0, 100, 0.5);
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should always return exactly 7 characters', () => {
      // Test various edge cases that previously caused overflow
      const testCases = [
        { h: 0, s: 0.5, l: 50 },
        { h: 120, s: 1, l: 100 },
        { h: 240, s: 0, l: -10 },
        { h: 360, s: 2, l: 2 },
      ];

      for (const { h, s, l } of testCases) {
        const result = hslToHex(h, s, l);
        expect(result).toHaveLength(7);
        expect(result).toMatch(/^#[0-9a-f]{6}$/);
      }
    });
  });
});

describe('math utils', () => {
  describe('roundFloat', () => {
    it('should round to 2 decimal places by default', () => {
      expect(roundFloat(3.14159)).toBe(3.14);
      expect(roundFloat(2.999)).toBe(3);
      expect(roundFloat(1.234)).toBe(1.23);
    });

    it('should round to specified decimal places', () => {
      expect(roundFloat(3.14159, 0)).toBe(3);
      expect(roundFloat(3.14159, 1)).toBe(3.1);
      expect(roundFloat(3.14159, 3)).toBe(3.142);
      expect(roundFloat(3.14159, 4)).toBe(3.1416);
    });

    it('should handle negative numbers', () => {
      expect(roundFloat(-3.14159)).toBe(-3.14);
      expect(roundFloat(-2.999, 1)).toBe(-3);
    });

    it('should handle integers', () => {
      expect(roundFloat(5)).toBe(5);
      expect(roundFloat(5, 3)).toBe(5);
    });
  });
});

describe('random utils', () => {
  describe('randomInt', () => {
    it('should return integer within range with two args', () => {
      for (let i = 0; i < 100; i++) {
        const result = randomInt(5, 10);
        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(5);
        expect(result).toBeLessThanOrEqual(10);
      }
    });

    it('should return integer from 0 to max with one arg', () => {
      for (let i = 0; i < 100; i++) {
        const result = randomInt(10);
        expect(Number.isInteger(result)).toBe(true);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('randomFloat', () => {
    it('should return float within range with two args', () => {
      for (let i = 0; i < 100; i++) {
        const result = randomFloat(5, 10);
        expect(result).toBeGreaterThanOrEqual(5);
        expect(result).toBeLessThanOrEqual(10);
      }
    });

    it('should return float from 0 to max with one arg', () => {
      for (let i = 0; i < 100; i++) {
        const result = randomFloat(10);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(10);
      }
    });

    it('should return values with up to 2 decimal precision', () => {
      for (let i = 0; i < 100; i++) {
        const result = randomFloat(0, 1);
        const decimalPart = result.toString().split('.')[1] || '';
        expect(decimalPart.length).toBeLessThanOrEqual(2);
      }
    });
  });

  describe('randomString', () => {
    it('should return one of the provided options', () => {
      const options = ['a', 'b', 'c'] as const;

      for (let i = 0; i < 100; i++) {
        const result = randomString([...options]);
        expect(options).toContain(result);
      }
    });

    it('should handle single option', () => {
      const result = randomString(['only']);
      expect(result).toBe('only');
    });
  });

  describe('randomColor', () => {
    it('should return valid hex color', () => {
      for (let i = 0; i < 50; i++) {
        const result = randomColor();
        expect(result).toMatch(/^#[0-9a-f]{6}$/);
      }
    });

    it('should respect minL parameter', () => {
      // With minL=0.5, colors should be lighter (higher luminance)
      // We can't easily verify the exact luminance, but we can check format
      for (let i = 0; i < 50; i++) {
        const result = randomColor(0.5);
        expect(result).toMatch(/^#[0-9a-f]{6}$/);
      }
    });
  });

  describe('randomGradient', () => {
    it('should return array of at least 2 hex colors', () => {
      for (let i = 0; i < 20; i++) {
        const result = randomGradient();
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThanOrEqual(2);

        for (const color of result) {
          expect(color).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    });

    it('should respect maxColors parameter', () => {
      for (let i = 0; i < 50; i++) {
        const result = randomGradient(0, 5);
        // Length should be between 1 and 5, but could be +1 if wrapping
        expect(result.length).toBeLessThanOrEqual(6);
      }
    });

    it('should wrap gradient when length > 2', () => {
      // Run multiple times to get gradients with > 2 colors
      let foundWrappedGradient = false;

      for (let i = 0; i < 100; i++) {
        const result = randomGradient(0, 20);

        if (result.length > 2) {
          // First and last color should be the same
          expect(result[result.length - 1]).toBe(result[0]);
          foundWrappedGradient = true;
          break;
        }
      }
      expect(foundWrappedGradient).toBe(true);
    });

    it('should return valid hex colors with non-zero minLume', () => {
      // Test with minLume=0.5 (the sparkle effect use case)
      for (let i = 0; i < 20; i++) {
        const result = randomGradient(0.5, 6);
        expect(Array.isArray(result)).toBe(true);

        for (const color of result) {
          expect(color).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    });

    it('should return valid hex colors with various minLume values', () => {
      const minLumeValues = [0.1, 0.2, 0.3, 0.5, 0.7, 0.9];

      for (const minLume of minLumeValues) {
        for (let i = 0; i < 10; i++) {
          const result = randomGradient(minLume, 5);

          for (const color of result) {
            expect(color).toMatch(/^#[0-9a-f]{6}$/);
          }
        }
      }
    });
  });
});
