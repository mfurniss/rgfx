/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDebouncedStorage } from '../debounced-storage';

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createDebouncedStorage', () => {
  describe('getItem', () => {
    it('reads from localStorage immediately', () => {
      localStorage.setItem('key', 'value');
      const storage = createDebouncedStorage(500);

      expect(storage.getItem('key')).toBe('value');
    });

    it('returns null for missing keys', () => {
      const storage = createDebouncedStorage(500);

      expect(storage.getItem('missing')).toBeNull();
    });
  });

  describe('setItem', () => {
    it('does not write to localStorage synchronously', () => {
      const storage = createDebouncedStorage(500);

      storage.setItem('key', 'value');

      expect(localStorage.getItem('key')).toBeNull();
    });

    it('writes to localStorage after the debounce delay', () => {
      const storage = createDebouncedStorage(500);

      storage.setItem('key', 'value');
      vi.advanceTimersByTime(500);

      expect(localStorage.getItem('key')).toBe('value');
    });

    it('batches rapid calls into a single write with the last value', () => {
      const storage = createDebouncedStorage(500);

      storage.setItem('key', 'first');
      storage.setItem('key', 'second');
      storage.setItem('key', 'third');

      vi.advanceTimersByTime(500);

      expect(localStorage.getItem('key')).toBe('third');
    });
  });

  describe('removeItem', () => {
    it('removes from localStorage immediately', () => {
      localStorage.setItem('key', 'value');
      const storage = createDebouncedStorage(500);

      storage.removeItem('key');

      expect(localStorage.getItem('key')).toBeNull();
    });
  });
});
