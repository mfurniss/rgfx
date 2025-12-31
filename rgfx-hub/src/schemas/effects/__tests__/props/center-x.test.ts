/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import centerX from '../../properties/center-x';

describe('centerX schema', () => {
  describe('optional behavior', () => {
    it('should accept undefined (optional)', () => {
      const result = centerX.safeParse(undefined);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data).toBeUndefined();
      }
    });
  });

  describe('random literal', () => {
    it('should accept random string', () => {
      const result = centerX.safeParse('random');
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data).toBe('random');
      }
    });

    it('should reject other string values', () => {
      const result = centerX.safeParse('center');
      expect(result.success).toBe(false);
    });

    it('should reject uppercase random', () => {
      const result = centerX.safeParse('RANDOM');
      expect(result.success).toBe(false);
    });
  });

  describe('numeric values', () => {
    it('should accept zero', () => {
      const result = centerX.safeParse(0);
      expect(result.success).toBe(true);
    });

    it('should accept positive numbers', () => {
      const result = centerX.safeParse(100);
      expect(result.success).toBe(true);
    });

    it('should accept negative numbers', () => {
      const result = centerX.safeParse(-50);
      expect(result.success).toBe(true);
    });

    it('should accept decimal numbers', () => {
      const result = centerX.safeParse(33.5);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid types', () => {
    it('should reject boolean', () => {
      const result = centerX.safeParse(true);
      expect(result.success).toBe(false);
    });

    it('should reject object', () => {
      const result = centerX.safeParse({ x: 50 });
      expect(result.success).toBe(false);
    });

    it('should reject array', () => {
      const result = centerX.safeParse([50]);
      expect(result.success).toBe(false);
    });
  });
});
