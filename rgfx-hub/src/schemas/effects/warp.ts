/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { MAX_GRADIENT_COLORS } from '@/config/constants';
import { colorStringSchema } from './properties/color';
import { randomInt, randomGradient } from '@/utils/random';
import type { PresetConfig } from './index';
import type { FieldTypeMap } from '@/renderer/utils/zod-introspection';

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
      .default('fadeIn')
      .describe('off: instant off, on: instant on, fadeIn: fade in over 1s, fadeOut: fade out over 1s'),
    speed: z
      .number()
      .min(-50)
      .max(50)
      .optional()
      .default(2.5)
      .describe('Animation speed (positive=expand, negative=collapse)'),
    scale: z
      .number()
      .min(-10)
      .max(10)
      .optional()
      .default(3)
      .describe('Perspective (0=linear, >0=3D tunnel, <0=inverted)'),
    orientation: z
      .enum(['horizontal', 'vertical'])
      .optional()
      .default('horizontal')
      .describe('Radiation direction (horizontal=left/right from center, vertical=up/down)'),
    gradient: z
      .array(colorStringSchema)
      .max(MAX_GRADIENT_COLORS)
      .optional()
      .default(['#FFFF00', '#00FFFF', '#0000FF', '#FFFF00'])
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
