/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { MAX_GRADIENT_COLORS } from '@/config/constants';
import { colorStringSchema } from './properties/color';
import type { PresetConfig } from './index';
import { randomGradient, randomInt } from '@/utils/random';
import type { FieldTypeMap } from '@/renderer/utils/zod-introspection';
import defaults from './defaults.json';

const d = defaults.background;

export const fieldTypes: FieldTypeMap = {
  gradient: 'backgroundGradient',
};

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
          .default(d.gradient.colors),
        orientation: z.enum(['horizontal', 'vertical'])
          .default(d.gradient.orientation as 'horizontal'),
      })
      .default(
        d.gradient as { colors: string[]; orientation: 'horizontal' },
      )
      .describe('Gradient colors'),
    fadeDuration: z
      .number()
      .int()
      .min(0)
      .max(10000)
      .default(d.fadeDuration)
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
