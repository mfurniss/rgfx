import { z } from 'zod';
import { baseEffect, createNoOpCleaner } from './properties';
import { MAX_GRADIENT_COLORS } from '@/config/constants';
import { colorStringSchema } from './properties/color';
import { randomColor, randomInt, randomGradient, randomFloat } from '@/utils/random';
import type { FieldTypeMap } from '@/renderer/utils/zod-introspection';
import type { PresetConfig, LayoutConfig } from './index';
import defaults from './defaults.json';

const d = defaults.scroll_text;

export const cleanCodeProps = createNoOpCleaner({
  reset: true, accentColor: null, repeat: false, snapToLed: true,
});

export const fieldTypes: FieldTypeMap = {
  accentColor: 'color',
  gradient: 'gradientArray',
};

export function randomize(): Record<string, unknown> {
  return {
    accentColor: randomInt(1) ? randomColor() : null,
    gradient: randomGradient(0.2),
    gradientSpeed: randomFloat(0.1, 20),
    gradientScale: randomFloat(-10, 10),
    reset: true,
  };
}

/**
 * Scroll text effect props schema (base, without refinements)
 * Use this for .omit()/.pick() operations since Zod 4 doesn't allow
 * those on refined schemas
 */
export const scrollTextBaseSchema = baseEffect
  .omit({ color: true })
  .extend({
    name: z.literal('Scroll Text'),
    description: z.literal('Scrolling text marquee'),
    reset: z.boolean().optional().default(d.reset)
      .describe('Clear existing scroll text before adding new'),
    text: z.string().max(255).default(d.text)
      .describe('Text to scroll (max 255 chars)'),
    gradient: z
      .array(colorStringSchema)
      .min(1)
      .max(MAX_GRADIENT_COLORS)
      .default(d.gradient)
      .describe('Text colors (1 color = solid, 2+ = animated gradient)'),
    gradientSpeed: z
      .number()
      .min(0.1)
      .max(20)
      .optional()
      .default(d.gradientSpeed)
      .describe('Gradient animation speed'),
    gradientScale: z
      .number()
      .min(-20)
      .max(20)
      .optional()
      .default(d.gradientScale)
      .describe('Gradient pattern scale'),
    accentColor: z.string().nullable().optional()
      .default(d.accentColor)
      .describe('Optional accent/shadow color (hex or named)'),
    speed: z.number().min(1).max(500).optional().default(d.speed)
      .describe('Scroll speed in canvas pixels per second'),
    repeat: z.boolean().optional().default(d.repeat)
      .describe('Restart scrolling when text exits left edge'),
    snapToLed: z.boolean().optional().default(d.snapToLed)
      .describe('Snap scroll position to LED boundaries to reduce shimmer'),
  })
  .strict();

/**
 * Full scroll text schema
 * Renders scrolling text from right to left using an 8x8 bitmap font
 */
export default scrollTextBaseSchema;

export const presetConfig: PresetConfig = {
  type: 'plasma',
  apply: (data, values) => ({
    ...values,
    gradient: data.gradient,
    gradientSpeed: data.speed,
    gradientScale: data.scale,
  }),
};

export const layoutConfig: LayoutConfig = [
  ['reset', 'text'],
  ['gradient'],
  ['gradientSpeed', 'gradientScale'],
  ['accentColor', 'speed'],
  ['repeat', 'snapToLed'],
];
