import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { configureZod } from '../zod-config';

describe('configureZod', () => {
  beforeEach(() => {
    // Configure Zod before each test
    configureZod();
  });

  it('should return "Required field is missing" for undefined required fields', () => {
    const schema = z.object({
      name: z.string(),
    });

    const result = schema.safeParse({});

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Required field is missing');
    }
  });

  it('should preserve default messages for type mismatch errors', () => {
    const schema = z.object({
      count: z.number(),
    });

    const result = schema.safeParse({ count: 'not a number' });

    expect(result.success).toBe(false);

    if (!result.success) {
      // Default Zod message for type mismatch should be preserved
      expect(result.error.issues[0].message).not.toBe('Required field is missing');
      expect(result.error.issues[0].message).toContain('number');
    }
  });

  it('should preserve default messages for string validation errors', () => {
    const schema = z.object({
      email: z.email(),
    });

    const result = schema.safeParse({ email: 'invalid' });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].message).not.toBe('Required field is missing');
    }
  });

  it('should handle nested object validation with missing fields', () => {
    const schema = z.object({
      user: z.object({
        name: z.string(),
      }),
    });

    const result = schema.safeParse({ user: {} });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Required field is missing');
    }
  });
});
