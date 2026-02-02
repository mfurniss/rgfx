/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { baseEffect } from './properties';
import { MAX_GRADIENT_COLORS } from '@/config/constants';
import { colorStringSchema } from './properties/color';
import { randomColor, randomString, randomFloat, randomInt, randomGradient } from '@/utils/random';
import type { PresetConfig } from './preset-config';
import type { FieldTypeMap } from '@/renderer/utils/zod-introspection';

export const fieldTypes: FieldTypeMap = {
  color: 'color',
  accentColor: 'color',
  gradient: 'gradientArray',
};

export function randomize(): Record<string, unknown> {
  return {
    text: randomString(['Hello You!', 'AaBbCcDd', '0123456789', '*** RGFX ***']),
    color: randomColor(0.2),
    accentColor: randomInt(1) ? randomColor(0.2) : null,
    duration: randomInt(3, 5) * 1000,
    gradient: randomGradient(0.2),
    gradientSpeed: randomFloat(0.1, 20),
    gradientScale: randomFloat(0.1, 10),
  };
}

/**
 * Text effect props schema
 * Renders text using an 8x8 bitmap font
 */
export default baseEffect
  .extend({
    name: z.literal('Text'),
    description: z.literal('Static text display'),
    reset: z.boolean().optional().default(true).describe('Clear existing text before rendering'),
    text: z.string().max(32).default('Hello You!').describe('Text to render (max 32 chars)'),
    color: z.string().optional().default('#FFA000').describe('Text color (hex or named)'),
    accentColor: z.string().nullable().optional().default('#900000').describe('Optional accent/shadow color (hex or named)'),
    duration: z.number().int().min(0).optional().default(3000).describe('Duration in ms (0 = infinite, use reset to clear)'),
    gradient: z
      .array(colorStringSchema)
      .max(MAX_GRADIENT_COLORS)
      .optional()
      .describe('Gradient colors for text animation'),
    gradientSpeed: z
      .number()
      .min(0.1)
      .max(50)
      .optional()
      .default(3)
      .describe('Gradient animation speed'),
    gradientScale: z
      .number()
      .min(0.1)
      .max(10)
      .optional()
      .default(4)
      .describe('Gradient pattern scale'),
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
