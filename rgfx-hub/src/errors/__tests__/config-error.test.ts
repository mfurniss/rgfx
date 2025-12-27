/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ConfigError, formatZodError } from '../config-error';

describe('ConfigError', () => {
  describe('constructor', () => {
    it('should create an error with message, filePath, and details', () => {
      const error = new ConfigError(
        'Failed to parse config',
        '/path/to/config.json',
        'Unexpected token at position 42',
      );

      expect(error.message).toBe('Failed to parse config');
      expect(error.filePath).toBe('/path/to/config.json');
      expect(error.details).toBe('Unexpected token at position 42');
      expect(error.name).toBe('ConfigError');
    });

    it('should create an error without details', () => {
      const error = new ConfigError('Config invalid', '/path/to/file.json');

      expect(error.message).toBe('Config invalid');
      expect(error.filePath).toBe('/path/to/file.json');
      expect(error.details).toBeUndefined();
    });

    it('should be instanceof Error', () => {
      const error = new ConfigError('test', '/path');
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ConfigError);
    });
  });

  describe('toSystemError', () => {
    it('should convert to SystemError format', () => {
      const error = new ConfigError(
        'Invalid config structure',
        '/home/user/.rgfx/drivers.json',
        'Missing required field: id',
      );

      const systemError = error.toSystemError();

      expect(systemError.errorType).toBe('config');
      expect(systemError.message).toBe('Invalid config structure');
      expect(systemError.filePath).toBe('/home/user/.rgfx/drivers.json');
      expect(systemError.details).toBe('Missing required field: id');
      expect(typeof systemError.timestamp).toBe('number');
      expect(systemError.timestamp).toBeGreaterThan(0);
    });

    it('should generate current timestamp', () => {
      const before = Date.now();
      const error = new ConfigError('test', '/path');
      const systemError = error.toSystemError();
      const after = Date.now();

      expect(systemError.timestamp).toBeGreaterThanOrEqual(before);
      expect(systemError.timestamp).toBeLessThanOrEqual(after);
    });
  });
});

describe('formatZodError', () => {
  it('should format simple validation error with path', () => {
    const schema = z.object({
      name: z.string(),
    });

    const result = schema.safeParse({ name: 123 });
    expect(result.success).toBe(false);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted).toContain('name');
    }
  });

  it('should format missing required field error', () => {
    const schema = z.object({
      id: z.string(),
      macAddress: z.string(),
    });

    const result = schema.safeParse({ id: 'test' });
    expect(result.success).toBe(false);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted).toContain('macAddress');
    }
  });

  it('should format nested path errors', () => {
    const schema = z.object({
      config: z.object({
        pin: z.number(),
      }),
    });

    const result = schema.safeParse({ config: { pin: 'not a number' } });
    expect(result.success).toBe(false);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted).toContain('config.pin');
    }
  });

  it('should format unrecognized key error from strict mode', () => {
    const schema = z.object({
      name: z.string(),
    }).strict();

    const result = schema.safeParse({ name: 'test', extra: 'bad' });
    expect(result.success).toBe(false);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted).toContain('Unrecognized key');
      expect(formatted).toContain('extra');
    }
  });

  it('should join multiple errors with semicolon', () => {
    const schema = z.object({
      name: z.string(),
      count: z.number(),
    });

    const result = schema.safeParse({ name: 123, count: 'bad' });
    expect(result.success).toBe(false);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      expect(formatted).toContain(';');
    }
  });

  it('should replace "received undefined" with "field is missing"', () => {
    const schema = z.object({
      required: z.string(),
    });

    const result = schema.safeParse({});
    expect(result.success).toBe(false);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      // The replacement should occur
      expect(formatted).not.toContain('received undefined');
    }
  });

  it('should handle error at root level (no path)', () => {
    const schema = z.string();

    const result = schema.safeParse(123);
    expect(result.success).toBe(false);

    if (!result.success) {
      const formatted = formatZodError(result.error);
      // Should not have "at" since path is empty
      expect(formatted).not.toContain(' at ""');
    }
  });
});
