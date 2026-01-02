/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect } from 'vitest';
import { generateBroadcastCode } from '../code-generator';

describe('generateBroadcastCode', () => {
  describe('standard effects', () => {
    it('should generate basic broadcast code', () => {
      const result = generateBroadcastCode('solid', { color: [255, 0, 0] }, [], true);

      expect(result).toContain("effect: 'solid'");
      expect(result).toContain('props:');
      expect(result).toContain('color: [255, 0, 0]');
      expect(result).toMatch(/^broadcast\(\{/);
      expect(result).toMatch(/\}\);$/);
    });

    it('should include drivers when targeting specific drivers', () => {
      const result = generateBroadcastCode(
        'pulse',
        { speed: 100 },
        ['driver-1', 'driver-2'],
        false,
      );

      expect(result).toContain("drivers: ['driver-1', 'driver-2']");
      expect(result).toContain("effect: 'pulse'");
    });

    it('should not include drivers when targeting all drivers', () => {
      const result = generateBroadcastCode(
        'rainbow',
        { speed: 50 },
        ['driver-1', 'driver-2'],
        true,
      );

      expect(result).not.toContain('drivers:');
    });

    it('should strip __gifPath from props', () => {
      const result = generateBroadcastCode(
        'solid',
        { color: [0, 255, 0], __gifPath: '/path/to/file.gif' },
        [],
        true,
      );

      expect(result).not.toContain('__gifPath');
      expect(result).not.toContain('/path/to/file.gif');
    });

    it('should handle empty props', () => {
      const result = generateBroadcastCode('clear', {}, [], true);

      expect(result).toContain("effect: 'clear'");
      expect(result).toContain('props: {}');
    });
  });

  describe('GIF bitmap effects', () => {
    it('should generate cached loadGif and broadcast call for bitmap effects', () => {
      const props = {
        __gifPath: '/sprites/explosion.gif',
        images: [[1, 2], [3, 4]],
        palette: [[255, 0, 0]],
        frameRate: 30,
        loop: true,
      };

      const result = generateBroadcastCode('bitmap', props, [], true);

      expect(result).toMatch(/^let sprite;/);
      expect(result).toContain('if (!sprite) {');
      expect(result).toContain("sprite = await loadGif('/sprites/explosion.gif')");
      expect(result).toContain('broadcast({');
      expect(result).toContain('images: sprite.images');
      expect(result).toContain('palette: sprite.palette');
      expect(result).toContain('sprite.frameRate');
      expect(result).toContain('loop: true');
      expect(result).toMatch(/\}\);$/);
    });

    it('should use sprite properties for images, palette, frameRate in GIF bitmap', () => {
      const props = {
        __gifPath: '/test.gif',
        images: [[1]],
        palette: [[0, 0, 0]],
        frameRate: 24,
        offsetX: 10,
        offsetY: 5,
      };

      const result = generateBroadcastCode('bitmap', props, [], true);

      expect(result).toContain('images: sprite.images');
      expect(result).toContain('palette: sprite.palette');
      expect(result).toContain('sprite.frameRate');
      expect(result).toContain('offsetX: 10');
      expect(result).toContain('offsetY: 5');
    });

    it('should include drivers in GIF bitmap code when targeting specific drivers', () => {
      const props = {
        __gifPath: '/test.gif',
        images: [],
        palette: [],
      };

      const result = generateBroadcastCode('bitmap', props, ['driver-a'], false);

      expect(result).toContain("drivers: ['driver-a']");
    });

    it('should not include drivers in GIF bitmap code when targeting all', () => {
      const props = {
        __gifPath: '/test.gif',
        images: [],
        palette: [],
      };

      const result = generateBroadcastCode('bitmap', props, ['driver-a'], true);

      expect(result).not.toContain('drivers:');
    });
  });

  describe('driver array formatting', () => {
    it('should format single driver inline', () => {
      const result = generateBroadcastCode('solid', { color: [0, 0, 255] }, ['only-one'], false);

      expect(result).toContain("drivers: ['only-one']");
    });

    it('should format multiple drivers inline when 3 or fewer', () => {
      const result = generateBroadcastCode(
        'solid',
        {},
        ['d1', 'd2', 'd3'],
        false,
      );

      expect(result).toContain("drivers: ['d1', 'd2', 'd3']");
    });

    it('should format many drivers on multiple lines', () => {
      const result = generateBroadcastCode(
        'solid',
        {},
        ['d1', 'd2', 'd3', 'd4'],
        false,
      );

      expect(result).toContain('drivers: [');
      expect(result).toContain("'d1',");
      expect(result).toContain("'d2',");
      expect(result).toContain("'d3',");
      expect(result).toContain("'d4',");
    });
  });
});
