import { z } from 'zod';
import { baseEffect, createNoOpCleaner } from './properties';
import { MAX_GRADIENT_COLORS } from '@/config/constants';
import { colorStringSchema } from './properties/color';
import { randomColor, randomString, randomFloat, randomInt, randomGradient } from '@/utils/random';
import type { FieldTypeMap } from '@/renderer/utils/zod-introspection';
import type { PresetConfig, LayoutConfig } from './index';
import defaults from './defaults.json';

const d = defaults.text;

export const cleanCodeProps = createNoOpCleaner({ reset: false, accentColor: null });

export const fieldTypes: FieldTypeMap = {
  accentColor: 'color',
  gradient: 'gradientArray',
};

export function randomize(): Record<string, unknown> {
  return {
    text: randomString(['*** RGFX ***', 'AaBbCcDd', '0123456789', 'Hello!']),
    accentColor: randomInt(1) ? randomColor(0.2) : null,
    duration: randomInt(3, 5) * 1000,
    gradient: randomGradient(0.2),
    gradientSpeed: randomFloat(0.1, 20),
    gradientScale: randomFloat(-20, 20),
    reset: true,
  };
}

/**
 * Text effect props schema
 * Renders text using an 8x8 bitmap font
 */
export default baseEffect
  .omit({ color: true })
  .extend({
    name: z.literal('Text'),
    description: z.literal('Static text display'),
    reset: z.boolean().optional().default(d.reset)
      .describe('Clear existing text before rendering'),
    text: z.string().max(31).default(d.text)
      .describe('Text to render (max 31 chars)'),
    gradient: z
      .array(colorStringSchema)
      .min(1)
      .max(MAX_GRADIENT_COLORS)
      .default(d.gradient)
      .describe('Text colors (1 color = solid, 2+ = animated gradient)'),
    gradientSpeed: z
      .number()
      .min(0.1)
      .max(50)
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
    accentColor: z.string().nullable().optional().default(d.accentColor)
      .describe('Optional accent/shadow color (hex or named)'),
    duration: z.number().int().min(0).optional().default(d.duration)
      .describe('Duration in ms (0 = infinite, use reset to clear)'),
  })
  .strict();

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
  ['accentColor', 'duration'],
];
