/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { MAX_GRADIENT_COLORS } from '@/config/constants';
import { colorStringSchema } from './properties/color';
import { randomFloat, randomGradient } from '@/utils/random';
import type { PresetConfig } from './index';
import type { FieldTypeMap } from '@/renderer/utils/zod-introspection';
import defaults from './defaults.json';

const d = defaults.plasma;

export const fieldTypes: FieldTypeMap = {
  gradient: 'gradientArray',
};

export function randomize(): Record<string, unknown> {
  return {
    speed: randomFloat(0.1, 20),
    scale: randomFloat(0.1, 10),
    enabled: 'fadeIn',
    gradient: randomGradient(),
  };
}

/**
 * Plasma effect props schema
 * Classic demoscene plasma effect using Perlin noise.
 * Fills the entire canvas with animated colors from a user-defined gradient.
 * Renders on top of background with alpha blending.
 *
 * Note: Does not extend baseEffect because:
 * - 'reset' doesn't make sense for a singleton effect (use enabled: 'off' instead)
 * - Plasma has similar semantics to background (on/off, not instances)
 */
export default z
  .object({
    name: z.literal('Plasma'),
    description: z.literal('Classic demoscene plasma effect'),
    speed: z
      .number()
      .min(0.1)
      .max(20)
      .optional()
      .default(d.speed)
      .describe('Animation speed multiplier (1 = normal speed)'),
    scale: z
      .number()
      .min(0.1)
      .max(10)
      .optional()
      .default(d.scale)
      .describe('Pattern frequency (0.1-10, higher = more detailed)'),
    gradient: z
      .array(colorStringSchema)
      .max(MAX_GRADIENT_COLORS)
      .optional()
      .default(d.gradient)
      .describe(`Gradient colors (up to ${MAX_GRADIENT_COLORS} hex colors)`),
    enabled: z
      .enum(['off', 'on', 'fadeIn', 'fadeOut'])
      .optional()
      .default(d.enabled as 'on')
      .describe('off: instant off, on: instant on, fadeIn: fade in over 1s, fadeOut: fade out over 1s'),
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
