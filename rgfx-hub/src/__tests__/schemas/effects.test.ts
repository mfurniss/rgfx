import { describe, it, expect } from 'vitest';

import backgroundSchema, { randomize as randomizeBackground, presetConfig as backgroundPreset } from '@/schemas/effects/background';
import explodeSchema, { randomize as randomizeExplode } from '@/schemas/effects/explode';
import particleFieldSchema, { randomize as randomizeParticleField } from '@/schemas/effects/particle-field';
import plasmaSchema, { randomize as randomizePlasma, presetConfig as plasmaPreset } from '@/schemas/effects/plasma';
import projectileSchema, { randomize as randomizeProjectile } from '@/schemas/effects/projectile';
import { randomize as randomizeScrollText, presetConfig as scrollTextPreset } from '@/schemas/effects/scroll-text';
import { randomize as randomizeText, presetConfig as textPreset } from '@/schemas/effects/text';
import wipeSchema, { randomize as randomizeWipe } from '@/schemas/effects/wipe';
import sparkleSchema, { randomize as randomizeSparkle } from '@/schemas/effects/sparkle';

describe('Effect Schema Randomize Functions', () => {
  describe('background', () => {
    it('randomize returns valid values', () => {
      for (let i = 0; i < 10; i++) {
        const values = randomizeBackground();
        expect(values).toHaveProperty('gradient');
        expect(values).toHaveProperty('fadeDuration');
        expect((values.gradient as { colors: string[] }).colors).toBeInstanceOf(Array);
        expect(typeof values.fadeDuration).toBe('number');
      }
    });

    it('presetConfig applies gradient correctly', () => {
      const data = { gradient: ['#FF0000', '#00FF00'] };
      const values = { gradient: { colors: ['#0000FF'], orientation: 'vertical' as const } };
      const result = backgroundPreset.apply(data, values) as {
        gradient: { colors: string[]; orientation: string };
      };
      expect(result.gradient.colors).toEqual(['#FF0000', '#00FF00']);
      expect(result.gradient.orientation).toBe('vertical');
    });

    it('presetConfig uses default orientation when not provided', () => {
      const data = { gradient: ['#FF0000'] };
      const values = {};
      const result = backgroundPreset.apply(data, values) as {
        gradient: { colors: string[]; orientation: string };
      };
      expect(result.gradient.orientation).toBe('horizontal');
    });
  });

  describe('explode', () => {
    it('randomize returns valid values', () => {
      for (let i = 0; i < 10; i++) {
        const values = randomizeExplode();
        expect(values).toHaveProperty('color');
        expect(values).toHaveProperty('centerX');
        expect(values).toHaveProperty('centerY');
        expect(values).toHaveProperty('friction');
        expect(values).toHaveProperty('gravity');
        expect(values).toHaveProperty('particleCount');
        expect(typeof values.color).toBe('string');
        expect((values.color as string)).toMatch(/^#[0-9a-f]{6}$/);
      }
    });

    it('schema validates randomized values', () => {
      for (let i = 0; i < 10; i++) {
        const values = randomizeExplode();
        const result = explodeSchema.safeParse({
          name: 'Explode',
          description: 'Expanding particle burst from a center point',
          ...values,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('particle-field', () => {
    it('randomize returns valid values', () => {
      for (let i = 0; i < 10; i++) {
        const values = randomizeParticleField();
        expect(values).toHaveProperty('color');
        expect(values).toHaveProperty('direction');
        expect(values).toHaveProperty('density');
        expect(values).toHaveProperty('speed');
        expect(values).toHaveProperty('size');
        expect(['up', 'down', 'left', 'right']).toContain(values.direction);
      }
    });

    it('schema validates randomized values', () => {
      for (let i = 0; i < 10; i++) {
        const values = randomizeParticleField();
        const result = particleFieldSchema.safeParse({
          name: 'Particle Field',
          description: 'Moving particles for starfields, rain, snow effects',
          ...values,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('plasma', () => {
    it('randomize returns valid values', () => {
      for (let i = 0; i < 10; i++) {
        const values = randomizePlasma();
        expect(values).toHaveProperty('speed');
        expect(values).toHaveProperty('scale');
        expect(values).toHaveProperty('enabled');
        expect(values).toHaveProperty('gradient');
        expect(typeof values.speed).toBe('number');
        expect(typeof values.scale).toBe('number');
      }
    });

    it('presetConfig applies values correctly', () => {
      const data = { gradient: ['#FF0000', '#00FF00'], speed: 5, scale: 2 };
      const values = { enabled: 'on' as const };
      const result = plasmaPreset.apply(data, values);
      expect(result.gradient).toEqual(['#FF0000', '#00FF00']);
      expect(result.speed).toBe(5);
      expect(result.scale).toBe(2);
      expect(result.enabled).toBe('on');
    });
  });

  describe('projectile', () => {
    it('randomize returns valid values', () => {
      for (let i = 0; i < 10; i++) {
        const values = randomizeProjectile();
        expect(values).toHaveProperty('color');
        expect(values).toHaveProperty('direction');
        expect(values).toHaveProperty('velocity');
        expect(values).toHaveProperty('friction');
        expect(values).toHaveProperty('width');
        expect(values).toHaveProperty('height');
        expect(['left', 'right']).toContain(values.direction);
      }
    });

    it('schema validates randomized values', () => {
      for (let i = 0; i < 10; i++) {
        const values = randomizeProjectile();
        const result = projectileSchema.safeParse({
          name: 'Projectile',
          description: 'Animated projectile moving across display',
          ...values,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('scroll-text', () => {
    it('randomize returns valid values', () => {
      for (let i = 0; i < 10; i++) {
        const values = randomizeScrollText();
        expect(values).toHaveProperty('color');
        expect(values).toHaveProperty('gradient');
        expect(values).toHaveProperty('gradientSpeed');
        expect(values).toHaveProperty('gradientScale');
      }
    });

    it('presetConfig applies values correctly', () => {
      const data = { gradient: ['#FF0000'], speed: 10, scale: 5 };
      const values = { text: 'Hello' };
      const result = scrollTextPreset.apply(data, values);
      expect(result.gradient).toEqual(['#FF0000']);
      expect(result.gradientSpeed).toBe(10);
      expect(result.gradientScale).toBe(5);
      expect(result.text).toBe('Hello');
    });
  });

  describe('text', () => {
    it('randomize returns valid values', () => {
      for (let i = 0; i < 10; i++) {
        const values = randomizeText();
        expect(values).toHaveProperty('text');
        expect(values).toHaveProperty('color');
        expect(values).toHaveProperty('duration');
        expect(typeof values.text).toBe('string');
        expect(typeof values.duration).toBe('number');
      }
    });

    it('presetConfig applies values correctly', () => {
      const data = { gradient: ['#FF0000'], speed: 10, scale: 5 };
      const values = { text: 'Test' };
      const result = textPreset.apply(data, values);
      expect(result.gradient).toEqual(['#FF0000']);
      expect(result.gradientSpeed).toBe(10);
      expect(result.gradientScale).toBe(5);
      expect(result.text).toBe('Test');
    });
  });

  describe('wipe', () => {
    it('randomize returns valid values', () => {
      for (let i = 0; i < 10; i++) {
        const values = randomizeWipe();
        expect(values).toHaveProperty('color');
        expect(values).toHaveProperty('duration');
        expect(values).toHaveProperty('direction');
        expect(values).toHaveProperty('blendMode');
        expect(['left', 'right', 'up', 'down', 'random']).toContain(values.direction);
        expect(['additive', 'replace']).toContain(values.blendMode);
      }
    });

    it('schema validates randomized values', () => {
      for (let i = 0; i < 10; i++) {
        const values = randomizeWipe();
        const result = wipeSchema.safeParse({
          name: 'Wipe',
          description: 'Directional color wipe across the display',
          ...values,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe('sparkle', () => {
    it('randomize returns valid values', () => {
      for (let i = 0; i < 10; i++) {
        const values = randomizeSparkle();
        expect(values).toHaveProperty('duration');
        expect(values).toHaveProperty('density');
        expect(values).toHaveProperty('gradient');
        expect(values).toHaveProperty('speed');
        expect(values).toHaveProperty('bloom');
        expect(typeof values.duration).toBe('number');
        expect(typeof values.density).toBe('number');
        expect(values.gradient).toBeInstanceOf(Array);
        expect(typeof values.speed).toBe('number');
        expect(typeof values.bloom).toBe('number');
      }
    });

    it('schema validates randomized values', () => {
      for (let i = 0; i < 10; i++) {
        const values = randomizeSparkle();
        const result = sparkleSchema.safeParse({
          name: 'Sparkle',
          description: 'Twinkling particles cycling through a gradient',
          ...values,
        });
        expect(result.success).toBe(true);
      }
    });
  });
});

describe('Effect Schema Validation', () => {
  it('background schema validates correctly', () => {
    const valid = backgroundSchema.safeParse({
      name: 'Background',
      description: 'Gradient background fill',
      gradient: {
        colors: ['#FF0000', '#00FF00'],
        orientation: 'horizontal',
      },
      fadeDuration: 500,
    });
    expect(valid.success).toBe(true);
  });

  it('background schema rejects invalid gradient colors', () => {
    const invalid = backgroundSchema.safeParse({
      name: 'Background',
      description: 'Gradient background fill',
      gradient: {
        colors: ['not-a-color'],
        orientation: 'horizontal',
      },
    });
    expect(invalid.success).toBe(false);
  });

  it('wipe schema validates correctly', () => {
    const valid = wipeSchema.safeParse({
      name: 'Wipe',
      description: 'Directional color wipe across the display',
      color: '#FF0000',
      direction: 'left',
      duration: 1000,
      blendMode: 'additive',
    });
    expect(valid.success).toBe(true);
  });

  it('wipe schema uses defaults', () => {
    const result = wipeSchema.parse({
      name: 'Wipe',
      description: 'Directional color wipe across the display',
    });
    expect(result.direction).toBe('random');
    expect(result.duration).toBe(500);
    expect(result.blendMode).toBe('additive');
  });

  it('plasma schema validates correctly', () => {
    const valid = plasmaSchema.safeParse({
      name: 'Plasma',
      description: 'Classic demoscene plasma effect',
      speed: 5,
      scale: 3,
      gradient: ['#FF0000', '#00FF00'],
      enabled: 'fadeIn',
    });
    expect(valid.success).toBe(true);
  });

  it('sparkle schema validates correctly', () => {
    const valid = sparkleSchema.safeParse({
      name: 'Sparkle',
      description: 'Twinkling particles cycling through a gradient',
      duration: 3000,
      density: 50,
      gradient: ['#FFFFFF', '#FFFF00', '#FF0000', '#000000'],
      speed: 1.5,
      bloom: 25,
    });
    expect(valid.success).toBe(true);
  });

  it('sparkle schema uses defaults', () => {
    const result = sparkleSchema.parse({
      name: 'Sparkle',
      description: 'Twinkling particles cycling through a gradient',
    });
    expect(result.duration).toBe(3000);
    expect(result.density).toBe(30);
    expect(result.speed).toBe(1.0);
    expect(result.bloom).toBe(0);
    expect(result.reset).toBe(false);
  });

  it('sparkle schema rejects invalid gradient', () => {
    const invalid = sparkleSchema.safeParse({
      name: 'Sparkle',
      description: 'Twinkling particles cycling through a gradient',
      gradient: ['#FF0000'], // Needs at least 2 colors
    });
    expect(invalid.success).toBe(false);
  });

  it('sparkle schema rejects out-of-range values', () => {
    const invalidDensity = sparkleSchema.safeParse({
      name: 'Sparkle',
      description: 'Twinkling particles cycling through a gradient',
      density: 101, // Max is 100
    });
    expect(invalidDensity.success).toBe(false);

    const invalidBloom = sparkleSchema.safeParse({
      name: 'Sparkle',
      description: 'Twinkling particles cycling through a gradient',
      bloom: 150, // Max is 100
    });
    expect(invalidBloom.success).toBe(false);

    const invalidSpeed = sparkleSchema.safeParse({
      name: 'Sparkle',
      description: 'Twinkling particles cycling through a gradient',
      speed: 10, // Max is 5.0
    });
    expect(invalidSpeed.success).toBe(false);
  });
});
