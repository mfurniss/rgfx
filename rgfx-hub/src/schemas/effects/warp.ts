import { z } from 'zod';
import { MAX_GRADIENT_COLORS } from '@/config/constants';
import { colorStringSchema } from './properties/color';
import { randomInt, randomGradient } from '@/utils/random';
import type { PresetConfig } from './index';
import type { FieldTypeMap } from '@/renderer/utils/zod-introspection';
import defaults from './defaults.json';

const d = defaults.warp;

export const fieldTypes: FieldTypeMap = {
  gradient: 'gradientArray',
};

export function randomize(): Record<string, unknown> {
  return {
    speed: randomInt(-10, 10),
    scale: randomInt(-10, 10),
    enabled: 'fadeIn',
    orientation: Math.random() > 0.5 ? 'horizontal' : 'vertical',
    gradient: randomGradient(),
  };
}

/**
 * Warp effect props schema
 * Old-school 3D-type warp effect where a gradient radiates from the center
 * of the display outward (or inward with negative speed).
 *
 * Note: Does not extend baseEffect because:
 * - 'reset' doesn't make sense for a singleton effect (use enabled: 'off' instead)
 * - Warp has similar semantics to plasma (on/off, not instances)
 */
export default z
  .object({
    name: z.literal('Warp'),
    description: z.literal('Center-radiating animated gradient effect'),
    enabled: z
      .enum(['off', 'on', 'fadeIn', 'fadeOut'])
      .optional()
      .default(d.enabled as 'fadeIn')
      .describe('off: instant off, on: instant on, fadeIn: fade in over 1s, fadeOut: fade out over 1s'),
    speed: z
      .number()
      .min(-50)
      .max(50)
      .optional()
      .default(d.speed)
      .describe('Animation speed (positive=expand, negative=collapse)'),
    scale: z
      .number()
      .min(-10)
      .max(10)
      .optional()
      .default(d.scale)
      .describe('Perspective (0=linear, >0=3D tunnel, <0=inverted)'),
    orientation: z
      .enum(['horizontal', 'vertical'])
      .optional()
      .default(d.orientation as 'horizontal')
      .describe('Radiation direction (horizontal=left/right from center, vertical=up/down)'),
    gradient: z
      .array(colorStringSchema)
      .max(MAX_GRADIENT_COLORS)
      .optional()
      .default(d.gradient)
      .describe(`Gradient colors (up to ${MAX_GRADIENT_COLORS} hex colors)`),
  })
  .strict();

export const presetConfig: PresetConfig = {
  type: 'plasma',
  apply: (data, values) => ({
    ...values,
    gradient: data.gradient,
    speed: data.speed,
    scale: data.scale,
  }),
};
