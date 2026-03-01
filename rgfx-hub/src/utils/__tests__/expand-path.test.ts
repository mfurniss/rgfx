import { describe, it, expect } from 'vitest';
import { homedir } from 'os';
import { expandPath } from '../expand-path';
import { np } from '@/__tests__/test-utils';

describe('expandPath', () => {
  const home = homedir();

  describe('tilde expansion', () => {
    it('expands ~ to home directory', () => {
      const result = expandPath('~/Documents');
      expect(np(result)).toBe(`${np(home)}/Documents`);
    });

    it('expands ~/path without double slashes', () => {
      const result = expandPath('~/foo/bar');
      expect(np(result)).toBe(`${np(home)}/foo/bar`);
    });

    it('expands ~ alone to home directory', () => {
      const result = expandPath('~');
      expect(np(result)).toBe(np(home));
    });

    it('handles nested paths after tilde', () => {
      const result = expandPath('~/a/b/c/d');
      expect(np(result)).toBe(`${np(home)}/a/b/c/d`);
    });
  });

  describe('non-tilde paths', () => {
    it('returns absolute paths unchanged', () => {
      const result = expandPath('/usr/local/bin');
      expect(result).toBe('/usr/local/bin');
    });

    it('returns relative paths unchanged', () => {
      const result = expandPath('relative/path');
      expect(result).toBe('relative/path');
    });

    it('returns paths with tilde in middle unchanged', () => {
      const result = expandPath('/path/with~/tilde');
      expect(result).toBe('/path/with~/tilde');
    });

    it('returns empty string unchanged', () => {
      const result = expandPath('');
      expect(result).toBe('');
    });
  });
});
