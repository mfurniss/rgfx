import { describe, it, expect } from 'vitest';
import { centerY } from '@/schemas/effects/properties';

describe('centerY schema', () => {
  describe('optional behavior', () => {
    it('should accept undefined (optional)', () => {
      const result = centerY.safeParse(undefined);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });
  });

  describe('random literal', () => {
    it('should accept random string', () => {
      const result = centerY.safeParse('random');
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data).toBe('random');
      }
    });

    it('should reject other string values', () => {
      const result = centerY.safeParse('middle');
      expect(result.success).toBe(false);
    });
  });

  describe('numeric values', () => {
    it('should accept zero', () => {
      const result = centerY.safeParse(0);
      expect(result.success).toBe(true);
    });

    it('should accept positive numbers', () => {
      const result = centerY.safeParse(100);
      expect(result.success).toBe(true);
    });

    it('should accept negative numbers', () => {
      const result = centerY.safeParse(-25);
      expect(result.success).toBe(true);
    });

    it('should accept decimal numbers', () => {
      const result = centerY.safeParse(75.5);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid types', () => {
    it('should reject boolean', () => {
      const result = centerY.safeParse(false);
      expect(result.success).toBe(false);
    });

    it('should reject null', () => {
      const result = centerY.safeParse(null);
      expect(result.success).toBe(false);
    });
  });
});
