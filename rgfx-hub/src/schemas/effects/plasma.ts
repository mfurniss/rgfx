/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { MAX_GRADIENT_COLORS } from '@/config/constants';
import { randomColor, randomFloat, randomInt } from '@/utils/random';

export function randomize(): Record<string, unknown> {
  const gradient = [];

  for (let i = 0; i < randomInt(1, 20); i++ ) {
    gradient.push(randomColor(0));
  }

  if (gradient.length > 2) {
    gradient.push(gradient[0]);
  }

  return {
    speed: randomFloat(0.1, 20),
    scale: randomFloat(0.1, 10),
    enabled: 'fadeIn',
    gradient,
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
      .default(3)
      .describe('Animation speed multiplier (1 = normal speed)'),
    scale: z
      .number()
      .min(0.1)
      .max(10)
      .optional()
      .default(4)
      .describe('Pattern frequency (0.1-10, higher = more detailed)'),
    gradient: z
      .array(z.string().regex(/^#[0-9a-fA-F]{6}$/))
      .min(2)
      .max(MAX_GRADIENT_COLORS)
      .optional()
      .default(['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000'])
      .describe(`fieldType:gradientPreset|Gradient colors (2-${MAX_GRADIENT_COLORS} hex colors)`),
    enabled: z
      .enum(['off', 'on', 'fadeIn', 'fadeOut'])
      .optional()
      .default('on')
      .describe('off: instant off, on: instant on, fadeIn: fade in over 1s, fadeOut: fade out over 1s'),
  })
  .strict();
