/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { MAX_GRADIENT_COLORS } from '@/config/constants';
import { colorStringSchema } from './properties/color';
import type { PresetConfig } from './preset-config';
import { randomGradient, randomInt } from '@/utils/random';

export function randomize(): Record<string, unknown> {
  return {
    gradient: {
      colors: randomGradient(0, 6),
    },
    fadeDuration: randomInt(200, 2000),
  };
}

/**
 * Background effect props schema
 * Creates a gradient background that fills the entire canvas.
 * For solid colors, use a single-color gradient.
 * Singleton behavior: new background replaces any existing one.
 * Renders FIRST, before all other effects.
 *
 * Note: Does not extend baseEffect because:
 * - 'reset' doesn't make sense for a singleton effect (use enabled: 'off' instead)
 * - Background has different semantics than animated effects
 */
export default z
  .object({
    name: z.literal('Background'),
    description: z.literal('Gradient background fill'),
    gradient: z
      .object({
        colors: z
          .array(colorStringSchema)
          .max(MAX_GRADIENT_COLORS)
          .default(['#FF0000', '#00FF00', '#0000FF']),
        orientation: z.enum(['horizontal', 'vertical']).default('horizontal'),
      })
      .default({ colors: ['#FF0000', '#00FF00', '#0000FF'], orientation: 'horizontal' })
      .describe('fieldType:backgroundGradient|Gradient colors'),
    fadeDuration: z
      .number()
      .int()
      .min(0)
      .max(10000)
      .default(1000)
      .describe('Duration in ms to cross-fade to new gradient'),
  })
  .strict();

interface GradientValue {
  colors?: string[];
  orientation?: string;
}

export const presetConfig: PresetConfig = {
  type: 'gradient',
  apply: (data, values) => {
    const currentGradient = values.gradient as GradientValue | undefined;

    return {
      ...values,
      gradient: {
        colors: data.gradient,
        orientation: currentGradient?.orientation ?? 'horizontal',
      },
    };
  },
};
