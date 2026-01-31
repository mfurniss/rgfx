/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { MAX_GRADIENT_COLORS } from '@/config/constants';
import { colorStringSchema } from './properties/color';
import { randomInt, randomFloat, randomGradient } from '@/utils/random';

export function randomize(): Record<string, unknown> {
  return {
    duration: randomInt(1000, 5000),
    density: randomInt(10, 80),
    gradient: randomGradient(),
    speed: randomFloat(0.5, 3.0),
    bloom: randomInt(0, 50),
  };
}

/**
 * Sparkle effect props schema
 * Creates twinkling single-LED particles that cycle through a color gradient.
 * Triggering creates a "cloud" that spawns particles over its duration.
 *
 * Note: Does not extend baseEffect because it uses gradient instead of color.
 */
export default z
  .object({
    name: z.literal('Sparkle'),
    description: z.literal('Twinkling particles cycling through a gradient'),
    duration: z
      .number()
      .int()
      .min(0)
      .optional()
      .default(3000)
      .describe('Cloud duration in milliseconds (0 = infinite)'),
    density: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(30)
      .describe('Spawn rate (1-100, frame-rate independent)'),
    gradient: z
      .array(colorStringSchema)
      .min(2)
      .max(MAX_GRADIENT_COLORS)
      .optional()
      .default(['#FFFFFF', '#FFFF00', '#FF0000', '#000000'])
      .describe(`fieldType:gradientArray|Colors to cycle through (up to ${MAX_GRADIENT_COLORS} hex colors)`),
    speed: z
      .number()
      .min(0.1)
      .max(5.0)
      .optional()
      .default(1.0)
      .describe('Gradient cycling speed (higher = faster)'),
    bloom: z
      .number()
      .int()
      .min(0)
      .max(100)
      .optional()
      .default(0)
      .describe('Light spread radius (0=none, 100=4 LEDs)'),
    reset: z.boolean().optional().default(false).describe('Clear existing effects before adding'),
  })
  .strict();
