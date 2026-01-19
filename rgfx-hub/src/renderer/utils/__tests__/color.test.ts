import { describe, it, expect } from 'vitest';
import { isValidHex, normalizeHex, valueToHex, colorSwatchMap } from '../color';

describe('isValidHex', () => {
  it('returns true for valid 6-char hex with #', () => {
    expect(isValidHex('#FF0000')).toBe(true);
    expect(isValidHex('#00ff00')).toBe(true);
    expect(isValidHex('#123456')).toBe(true);
    expect(isValidHex('#abcdef')).toBe(true);
    expect(isValidHex('#ABCDEF')).toBe(true);
  });

  it('returns false for 3-char hex shorthand', () => {
    expect(isValidHex('#f00')).toBe(false);
    expect(isValidHex('#FFF')).toBe(false);
  });

  it('returns false for hex without #', () => {
    expect(isValidHex('FF0000')).toBe(false);
    expect(isValidHex('f00')).toBe(false);
  });

  it('returns false for invalid strings', () => {
    expect(isValidHex('red')).toBe(false);
    expect(isValidHex('invalid')).toBe(false);
    expect(isValidHex('')).toBe(false);
    expect(isValidHex('#GGGGGG')).toBe(false);
  });
});

describe('normalizeHex', () => {
  it('returns valid hex unchanged', () => {
    expect(normalizeHex('#FF0000')).toBe('#FF0000');
    expect(normalizeHex('#00ff00')).toBe('#00ff00');
  });

  it('adds # prefix when missing', () => {
    expect(normalizeHex('FF0000')).toBe('#FF0000');
    expect(normalizeHex('00ff00')).toBe('#00ff00');
  });

  it('expands 3-char shorthand with #', () => {
    expect(normalizeHex('#f00')).toBe('#ff0000');
    expect(normalizeHex('#0F0')).toBe('#00FF00');
    expect(normalizeHex('#abc')).toBe('#aabbcc');
  });

  it('expands 3-char shorthand without #', () => {
    expect(normalizeHex('f00')).toBe('#ff0000');
    expect(normalizeHex('0F0')).toBe('#00FF00');
    expect(normalizeHex('ABC')).toBe('#AABBCC');
  });

  it('returns invalid strings unchanged', () => {
    expect(normalizeHex('red')).toBe('red');
    expect(normalizeHex('invalid')).toBe('invalid');
    expect(normalizeHex('')).toBe('');
  });
});

describe('valueToHex', () => {
  it('converts numeric values to hex', () => {
    expect(valueToHex(0xff0000)).toBe('#ff0000');
    expect(valueToHex(0x00ff00)).toBe('#00ff00');
    expect(valueToHex(0)).toBe('#000000');
    expect(valueToHex(0xffffff)).toBe('#ffffff');
  });

  it('returns named colors from swatch map', () => {
    expect(valueToHex('red')).toBe('#ff0000');
    expect(valueToHex('green')).toBe('#00ff00');
    expect(valueToHex('blue')).toBe('#0000ff');
    expect(valueToHex('random')).toBe('#808080');
  });

  it('returns valid hex strings unchanged', () => {
    expect(valueToHex('#FF0000')).toBe('#FF0000');
    expect(valueToHex('#abcdef')).toBe('#abcdef');
  });

  it('adds # to 6-char hex without prefix', () => {
    expect(valueToHex('FF0000')).toBe('#FF0000');
    expect(valueToHex('abcdef')).toBe('#abcdef');
  });

  it('returns fallback for invalid values', () => {
    expect(valueToHex('invalid')).toBe('#808080');
    expect(valueToHex('')).toBe('#808080');
    expect(valueToHex(null)).toBe('#808080');
    expect(valueToHex(undefined)).toBe('#808080');
    expect(valueToHex({})).toBe('#808080');
  });
});

describe('colorSwatchMap', () => {
  it('contains expected named colors', () => {
    expect(colorSwatchMap.red).toBe('#ff0000');
    expect(colorSwatchMap.green).toBe('#00ff00');
    expect(colorSwatchMap.blue).toBe('#0000ff');
    expect(colorSwatchMap.white).toBe('#ffffff');
    expect(colorSwatchMap.black).toBe('#000000');
  });

  it('has gray and grey as aliases', () => {
    expect(colorSwatchMap.gray).toBe(colorSwatchMap.grey);
  });
});
