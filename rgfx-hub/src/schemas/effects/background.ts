/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

import { MAX_GRADIENT_COLORS } from '@/config/constants';
import color from './properties/color';

export function randomize(): Record<string, unknown> {
  return {};
}

/**
 * Background effect props schema
 * Creates a solid color background that fills the entire canvas.
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
    description: z.literal('Solid color background fill'),
    color: color.describe('Background color (used when gradient is not provided)'),
    gradient: z
      .array(z.string().regex(/^#[0-9a-fA-F]{6}$/))
      .min(2)
      .max(MAX_GRADIENT_COLORS)
      .optional()
      .describe('fieldType:gradientPreset|Gradient colors (overrides solid color when provided)'),
    orientation: z
      .enum(['horizontal', 'vertical'])
      .optional()
      .default('horizontal')
      .describe('Gradient direction (horizontal or vertical)'),
    enabled: z
      .enum(['off', 'on', 'fadeIn', 'fadeOut'])
      .optional()
      .default('on')
      .describe('off: instant off, on: instant on, fadeIn: fade in over 1s, fadeOut: fade out over 1s'),
  })
  .strict();
