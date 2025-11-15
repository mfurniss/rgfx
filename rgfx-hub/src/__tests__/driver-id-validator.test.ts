import { describe, it, expect } from 'vitest';
import { validateDriverId, isValidDriverId } from '../driver-id-validator';

describe('Driver ID Validator', () => {
  describe('validateDriverId', () => {
    it('should accept valid driver IDs', () => {
      const validIds = [
        'bedroom-leds',
        'cab-1',
        'player1',
        'rgfx-driver-0001',
        'test123',
        'a1b',
        'my-awesome-driver-name-123',
      ];

      for (const id of validIds) {
        const result = validateDriverId(id);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }
    });

    it('should reject empty or undefined IDs', () => {
      expect(validateDriverId('').valid).toBe(false);
      expect(validateDriverId('   ').valid).toBe(false);
      expect(validateDriverId('').error).toContain('cannot be empty');
    });

    it('should reject IDs that are too short', () => {
      const result = validateDriverId('ab');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 3 characters');
    });

    it('should reject IDs that are too long', () => {
      const longId = 'a'.repeat(33);
      const result = validateDriverId(longId);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('cannot exceed 32 characters');
    });

    it('should reject IDs with uppercase letters', () => {
      const result = validateDriverId('MyDriver');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase');
    });

    it('should reject IDs with spaces', () => {
      const result = validateDriverId('my driver');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('lowercase');
    });

    it('should reject IDs with special characters', () => {
      const invalidIds = [
        'driver_1',
        'driver.1',
        'driver@1',
        'driver#1',
        'driver!1',
        'driver+1',
        'driver=1',
      ];

      for (const id of invalidIds) {
        const result = validateDriverId(id);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('lowercase');
      }
    });

    it('should reject IDs starting with hyphen', () => {
      const result = validateDriverId('-driver');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Must start and end');
    });

    it('should reject IDs ending with hyphen', () => {
      const result = validateDriverId('driver-');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Must start and end');
    });

    it('should accept IDs with hyphens in the middle', () => {
      const result = validateDriverId('my-driver-123');
      expect(result.valid).toBe(true);
    });

    it('should reject reserved words', () => {
      const reservedWords = [
        'system',
        'discovery',
        'discover',
        'broadcast',
        'all',
        'config',
        'test',
        'status',
        'info',
        'debug',
        'error',
        'admin',
        'root',
      ];

      for (const word of reservedWords) {
        const result = validateDriverId(word);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('reserved word');
      }
    });

    it('should reject reserved words regardless of case', () => {
      const result = validateDriverId('system');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('reserved word');
    });

    it('should allow reserved words as part of longer IDs', () => {
      const result = validateDriverId('my-system-driver');
      expect(result.valid).toBe(true);
    });

    it('should trim whitespace before validation', () => {
      const result = validateDriverId('  bedroom-leds  ');
      expect(result.valid).toBe(true);
    });
  });

  describe('isValidDriverId', () => {
    it('should return true for valid IDs', () => {
      expect(isValidDriverId('bedroom-leds')).toBe(true);
      expect(isValidDriverId('cab-1')).toBe(true);
    });

    it('should return false for invalid IDs', () => {
      expect(isValidDriverId('')).toBe(false);
      expect(isValidDriverId('MyDriver')).toBe(false);
      expect(isValidDriverId('system')).toBe(false);
    });
  });
});
