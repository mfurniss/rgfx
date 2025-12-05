/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { UnifiedPanelLayoutSchema } from '../driver-persistence';

describe('UnifiedPanelLayoutSchema', () => {
  describe('valid layouts', () => {
    it('should accept single panel [[0]]', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([[0]]);
      expect(result.success).toBe(true);
    });

    it('should accept 2x1 horizontal layout [[0, 1]]', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([[0, 1]]);
      expect(result.success).toBe(true);
    });

    it('should accept 1x2 vertical layout [[0], [1]]', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([[0], [1]]);
      expect(result.success).toBe(true);
    });

    it('should accept 2x2 sequential layout [[0, 1], [2, 3]]', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([
        [0, 1],
        [2, 3],
      ]);
      expect(result.success).toBe(true);
    });

    it('should accept 2x2 snake wiring layout [[0, 1], [3, 2]]', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([
        [0, 1],
        [3, 2],
      ]);
      expect(result.success).toBe(true);
    });

    it('should accept 3x3 layout with arbitrary wiring order', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([
        [0, 1, 2],
        [5, 4, 3],
        [6, 7, 8],
      ]);
      expect(result.success).toBe(true);
    });

    it('should accept 1x4 horizontal layout', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([[0, 1, 2, 3]]);
      expect(result.success).toBe(true);
    });

    it('should accept 4x1 vertical layout', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([[0], [1], [2], [3]]);
      expect(result.success).toBe(true);
    });
  });

  describe('shape validation', () => {
    it('should reject empty array', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([]);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'All rows must have the same length and be non-empty',
        );
      }
    });

    it('should reject array with empty row', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([[]]);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'All rows must have the same length and be non-empty',
        );
      }
    });

    it('should reject jagged array (inconsistent row lengths)', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([
        [0, 1],
        [2], // Only 1 element instead of 2
      ]);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'All rows must have the same length and be non-empty',
        );
      }
    });

    it('should reject non-integer values', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([[0.5, 1.5]]);
      expect(result.success).toBe(false);
    });

    it('should reject string values', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([['a', 'b']]);
      expect(result.success).toBe(false);
    });
  });

  describe('sequence validation', () => {
    it('should reject non-sequential indices (missing value)', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([[0, 2]]); // Missing 1
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Panel indices must be sequential from 0 to n-1',
        );
      }
    });

    it('should reject duplicate indices', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([[0, 0]]);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Panel indices must be sequential from 0 to n-1',
        );
      }
    });

    it('should reject negative indices', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([[-1, 0]]);
      expect(result.success).toBe(false);
    });

    it('should reject indices starting from non-zero', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([[1, 2]]); // Should start from 0
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Panel indices must be sequential from 0 to n-1',
        );
      }
    });

    it('should reject indices with gaps in 2x2 grid', () => {
      const result = UnifiedPanelLayoutSchema.safeParse([
        [0, 1],
        [2, 5], // 5 instead of 3, skips 3 and 4
      ]);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          'Panel indices must be sequential from 0 to n-1',
        );
      }
    });
  });

  describe('edge cases', () => {
    it('should accept large valid grid', () => {
      // 4x4 grid with all 16 panels
      const result = UnifiedPanelLayoutSchema.safeParse([
        [0, 1, 2, 3],
        [7, 6, 5, 4],
        [8, 9, 10, 11],
        [15, 14, 13, 12],
      ]);
      expect(result.success).toBe(true);
    });

    it('should preserve the original array order when valid', () => {
      const input = [
        [0, 1],
        [3, 2],
      ];
      const result = UnifiedPanelLayoutSchema.safeParse(input);
      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.data).toEqual(input);
      }
    });
  });
});
