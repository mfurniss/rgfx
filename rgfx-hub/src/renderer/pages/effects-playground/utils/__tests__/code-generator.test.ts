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

  describe('bitmap easing', () => {
    it('should exclude easing when endX and endY are not defined', () => {
      const result = generateBroadcastCode(
        'bitmap',
        { centerX: 0, centerY: 0, easing: 'linear', duration: 3000 },
        [],
        true,
      );

      expect(result).not.toContain('easing');
    });

    it('should include easing when endX is defined', () => {
      const result = generateBroadcastCode(
        'bitmap',
        { centerX: 0, centerY: 0, endX: 50, easing: 'linear', duration: 3000 },
        [],
        true,
      );

      expect(result).toContain("easing: 'linear'");
    });

    it('should include easing when endY is defined', () => {
      const result = generateBroadcastCode(
        'bitmap',
        { centerX: 0, centerY: 0, endY: 75, easing: 'bounceOut', duration: 3000 },
        [],
        true,
      );

      expect(result).toContain("easing: 'bounceOut'");
    });

    it('should exclude easing from GIF bitmap when endX and endY are not defined', () => {
      const result = generateBroadcastCode(
        'bitmap',
        { __gifPath: '/test.gif', images: [], palette: [], easing: 'linear', duration: 3000 },
        [],
        true,
      );

      expect(result).not.toContain('easing');
    });

    it('should include easing in GIF bitmap when endX is defined', () => {
      const result = generateBroadcastCode(
        'bitmap',
        { __gifPath: '/test.gif', images: [], palette: [], endX: 50, easing: 'linear', duration: 3000 },
        [],
        true,
      );

      expect(result).toContain("easing: 'linear'");
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

  describe('no-op prop cleanup', () => {
    it('should remove reset:false, gravity:0, hueSpread:0 from explode', () => {
      const result = generateBroadcastCode(
        'explode',
        { color: '#FF0000', reset: false, gravity: 0, hueSpread: 0, particleCount: 100 },
        [], true,
      );

      expect(result).not.toContain('reset');
      expect(result).not.toContain('gravity');
      expect(result).not.toContain('hueSpread');
      expect(result).toContain('particleCount: 100');
    });

    it('should keep non-zero gravity and hueSpread in explode', () => {
      const result = generateBroadcastCode(
        'explode',
        { color: '#FF0000', gravity: 200, hueSpread: 45 },
        [], true,
      );

      expect(result).toContain('gravity: 200');
      expect(result).toContain('hueSpread: 45');
    });

    it('should remove reset:false from pulse', () => {
      const result = generateBroadcastCode(
        'pulse',
        { color: '#FF0000', reset: false, duration: 800 },
        [], true,
      );

      expect(result).not.toContain('reset');
      expect(result).toContain('duration: 800');
    });

    it('should keep reset:true in pulse (non-default)', () => {
      const result = generateBroadcastCode(
        'pulse',
        { color: '#FF0000', reset: true, duration: 800 },
        [], true,
      );

      expect(result).toContain('reset: true');
    });

    it('should remove reset:false from wipe', () => {
      const result = generateBroadcastCode(
        'wipe',
        { color: '#FF0000', reset: false, duration: 500 },
        [], true,
      );

      expect(result).not.toContain('reset');
    });

    it('should remove reset:false and particleDensity:0 from projectile', () => {
      const result = generateBroadcastCode(
        'projectile',
        { color: '#FF0000', reset: false, particleDensity: 0, velocity: 1200 },
        [], true,
      );

      expect(result).not.toContain('reset');
      expect(result).not.toContain('particleDensity');
      expect(result).toContain('velocity: 1200');
    });

    it('should keep non-zero particleDensity in projectile', () => {
      const result = generateBroadcastCode(
        'projectile',
        { color: '#FF0000', particleDensity: 50 },
        [], true,
      );

      expect(result).toContain('particleDensity: 50');
    });

    it('should remove reset:false and accentColor:null from text', () => {
      const result = generateBroadcastCode(
        'text',
        { text: 'hi', reset: false, accentColor: null, gradient: ['#FF0000'], duration: 5000 },
        [], true,
      );

      expect(result).not.toContain('reset');
      expect(result).not.toContain('accentColor');
      expect(result).toContain('duration: 5000');
    });

    it('should keep non-null accentColor in text', () => {
      const result = generateBroadcastCode(
        'text',
        { text: 'hi', accentColor: '#333333', gradient: ['#FF0000'] },
        [], true,
      );

      expect(result).toContain("accentColor: '#333333'");
    });

    it('should remove reset:true, accentColor:null, repeat:false, snapToLed:true from scroll_text', () => {
      const result = generateBroadcastCode(
        'scroll_text',
        { text: 'hi', reset: true, accentColor: null, repeat: false, snapToLed: true, gradient: ['#FF0000'], speed: 150 },
        [], true,
      );

      expect(result).not.toContain('reset');
      expect(result).not.toContain('accentColor');
      expect(result).not.toContain('repeat');
      expect(result).not.toContain('snapToLed');
      expect(result).toContain('speed: 150');
    });

    it('should keep reset:false in scroll_text (non-default)', () => {
      const result = generateBroadcastCode(
        'scroll_text',
        { text: 'hi', reset: false, gradient: ['#FF0000'] },
        [], true,
      );

      expect(result).toContain('reset: false');
    });

    it('should remove reset:false from sparkle', () => {
      const result = generateBroadcastCode(
        'sparkle',
        { reset: false, density: 100, gradient: ['#000000', '#8000FF', '#000000'] },
        [], true,
      );

      expect(result).not.toContain('reset');
      expect(result).toContain('density: 100');
    });

    it('should remove reset:false, endX/endY:"random", and easing from bitmap', () => {
      const result = generateBroadcastCode(
        'bitmap',
        { reset: false, centerX: 50, centerY: 50, endX: 'random', endY: 'random', easing: 'linear', duration: 3000 },
        [], true,
      );

      expect(result).not.toContain('reset');
      expect(result).not.toContain('endX');
      expect(result).not.toContain('endY');
      expect(result).not.toContain('easing');
      expect(result).toContain('duration: 3000');
    });

    it('should keep endX/endY when set to specific positions in bitmap', () => {
      const result = generateBroadcastCode(
        'bitmap',
        { centerX: 50, centerY: 50, endX: 75, endY: 25, easing: 'linear', duration: 3000 },
        [], true,
      );

      expect(result).toContain('endX: 75');
      expect(result).toContain('endY: 25');
      expect(result).toContain("easing: 'linear'");
    });

    it('should keep reset:true in bitmap', () => {
      const result = generateBroadcastCode(
        'bitmap',
        { reset: true, centerX: 50, centerY: 50, duration: 3000 },
        [], true,
      );

      expect(result).toContain('reset: true');
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
