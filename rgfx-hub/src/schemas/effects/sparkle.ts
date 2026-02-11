/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { MAX_GRADIENT_COLORS } from '@/config/constants';
import { colorStringSchema } from './properties/color';
import { randomInt, randomColor, randomFloat } from '@/utils/random';
import type { FieldTypeMap } from '@/renderer/utils/zod-introspection';
import { hslToHex } from '@/renderer/utils/color';

export const fieldTypes: FieldTypeMap = {
  gradient: 'gradientArray',
  duration: { emptyValue: 0 },
  bloom: { emptyValue: 0 },
};

export function randomize(): Record<string, unknown> {
  const gradient = [randomColor()];
  let x = randomInt(0, 4);

  while (x--) {
    gradient.push(hslToHex(randomInt(360), 1, randomFloat(0.3, 0.7)));
  }

  gradient.push('#000000');

  return {
    duration: 3000,
    density: randomInt(5, 100),
    gradient,
    speed: randomFloat(0.2, 5 - (gradient.length / 2)),
    bloom: randomInt(1) === 0 ? 0 : randomInt(40, 100),
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
    description: z.literal('Sparkling particles cycling through a gradient'),
    duration: z
      .number()
      .int()
      .min(0)
      .optional()
      .default(3000)
      .describe('Duration in milliseconds (0 = infinite)'),
    density: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(100)
      .describe('Sparkle spawn rate (1-100)'),
    gradient: z
      .array(colorStringSchema)
      .min(2)
      .max(MAX_GRADIENT_COLORS)
      .optional()
      .default(['#000000', '#8000FF', '#000000'])
      .describe(`Colors to cycle through (up to ${MAX_GRADIENT_COLORS} hex colors)`),
    speed: z
      .number()
      .min(0.1)
      .max(5.0)
      .optional()
      .default(0.75)
      .describe('Gradient transition speed (0.1-5.0)'),
    bloom: z
      .number()
      .int()
      .min(0)
      .max(100)
      .optional()
      .default(90)
      .describe('Light spread radius (0=none, 100=4 LEDs)'),
    reset: z.boolean().optional().default(false).describe('Clear existing effects before adding'),
  })
  .strict();
