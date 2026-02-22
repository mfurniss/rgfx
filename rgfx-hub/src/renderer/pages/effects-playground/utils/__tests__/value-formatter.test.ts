import { describe, it, expect } from 'vitest';
import { createValueFormatter } from '../value-formatter';

describe('createValueFormatter', () => {
  const formatValue = createValueFormatter();

  describe('primitive values', () => {
    it('should format null', () => {
      expect(formatValue(null, 0)).toBe('null');
    });

    it('should format strings with single quotes', () => {
      expect(formatValue('hello', 0)).toBe("'hello'");
      expect(formatValue('', 0)).toBe("''");
      expect(formatValue('with spaces', 0)).toBe("'with spaces'");
    });

    it('should escape single quotes within strings', () => {
      expect(formatValue("it's", 0)).toBe("'it\\'s'");
      expect(formatValue("it's a 'test'", 0)).toBe("'it\\'s a \\'test\\''");
    });

    it('should escape backslashes within strings', () => {
      expect(formatValue('back\\slash', 0)).toBe("'back\\\\slash'");
    });

    it('should format numbers', () => {
      expect(formatValue(42, 0)).toBe('42');
      expect(formatValue(3.14, 0)).toBe('3.14');
      expect(formatValue(0, 0)).toBe('0');
      expect(formatValue(-100, 0)).toBe('-100');
    });

    it('should format booleans', () => {
      expect(formatValue(true, 0)).toBe('true');
      expect(formatValue(false, 0)).toBe('false');
    });
  });

  describe('arrays', () => {
    it('should format empty arrays', () => {
      expect(formatValue([], 0)).toBe('[]');
    });

    it('should format short arrays inline (3 or fewer items)', () => {
      expect(formatValue([1, 2, 3], 0)).toBe('[1, 2, 3]');
      expect(formatValue(['a', 'b'], 0)).toBe("['a', 'b']");
      expect(formatValue([true], 0)).toBe('[true]');
    });

    it('should format long arrays on multiple lines (more than 3 items)', () => {
      const result = formatValue([1, 2, 3, 4], 0);
      expect(result).toBe('[\n  1,\n  2,\n  3,\n  4,\n]');
    });

    it('should respect indentation for multi-line arrays', () => {
      const result = formatValue([1, 2, 3, 4], 1);
      expect(result).toBe('[\n    1,\n    2,\n    3,\n    4,\n  ]');
    });
  });

  describe('objects', () => {
    it('should format empty objects', () => {
      expect(formatValue({}, 0)).toBe('{}');
    });

    it('should format objects with multiple lines', () => {
      const result = formatValue({ name: 'test', value: 42 }, 0);
      expect(result).toBe("{\n  name: 'test',\n  value: 42,\n}");
    });

    it('should respect indentation for objects', () => {
      const result = formatValue({ key: 'value' }, 1);
      expect(result).toBe("{\n    key: 'value',\n  }");
    });

    it('should handle nested objects', () => {
      const result = formatValue({ outer: { inner: 'value' } }, 0);
      expect(result).toContain('outer:');
      expect(result).toContain('inner:');
      expect(result).toContain("'value'");
    });
  });

  describe('nested structures', () => {
    it('should handle arrays within objects', () => {
      const result = formatValue({ colors: ['red', 'green', 'blue'] }, 0);
      expect(result).toContain('colors:');
      expect(result).toContain("['red', 'green', 'blue']");
    });

    it('should handle objects within arrays', () => {
      const result = formatValue([{ a: 1 }, { b: 2 }], 0);
      expect(result).toContain('a: 1');
      expect(result).toContain('b: 2');
    });
  });

  describe('fallback behavior', () => {
    it('should use JSON.stringify for undefined', () => {
      // JSON.stringify returns undefined for undefined values
      expect(formatValue(undefined, 0)).toBeUndefined();
    });
  });
});
