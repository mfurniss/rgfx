import { describe, it, expect } from 'vitest';
import { parseAmbilight, hslToHex } from '../color-utils';

describe('parseAmbilight', () => {
  it('should expand 12-bit hex colors to 24-bit', () => {
    const result = parseAmbilight('F00,0F0,00F');
    expect(result.colors).toEqual(['#FF0000', '#00FF00', '#0000FF']);
  });

  it('should handle single color', () => {
    expect(parseAmbilight('ABC').colors).toEqual(['#AABBCC']);
  });

  it('should default orientation to horizontal', () => {
    expect(parseAmbilight('F00').orientation).toBe('horizontal');
  });

  it('should accept vertical orientation', () => {
    expect(parseAmbilight('F00', 'vertical').orientation).toBe('vertical');
  });

  it('should pad missing color channels with 0', () => {
    expect(parseAmbilight('A').colors).toEqual(['#AA0000']);
  });
});

describe('hslToHex', () => {
  it('should convert primary colors', () => {
    expect(hslToHex(0, 100, 50)).toBe('#FF0000');
    expect(hslToHex(120, 100, 50)).toBe('#00FF00');
    expect(hslToHex(240, 100, 50)).toBe('#0000FF');
  });

  it('should convert black and white', () => {
    expect(hslToHex(0, 0, 0)).toBe('#000000');
    expect(hslToHex(0, 0, 100)).toBe('#FFFFFF');
  });

  it('should convert gray', () => {
    expect(hslToHex(0, 0, 50)).toBe('#808080');
  });

  it('should handle hue wraparound', () => {
    expect(hslToHex(360, 100, 50)).toBe('#FF0000');
  });

  it('should handle negative hue', () => {
    expect(hslToHex(-60, 100, 50)).toBe('#FF00FF');
  });

  it('should clamp out-of-range saturation and lightness', () => {
    expect(hslToHex(0, 200, 50)).toBe('#FF0000');
    expect(hslToHex(0, 100, -50)).toBe('#000000');
  });
});
