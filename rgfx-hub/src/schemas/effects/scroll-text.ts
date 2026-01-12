/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { baseEffect } from './properties';
import { MAX_GRADIENT_COLORS } from '@/config/constants';
import { randomColor, randomInt, randomGradient, randomFloat } from '@/utils/random';
import type { PresetConfig } from './preset-config';

export function randomize(): Record<string, unknown> {
  return {
    color: randomColor(0.2),
    accentColor: randomInt(1) ? randomColor() : null,
    gradient: randomGradient(0.2),
    gradientSpeed: randomFloat(0.1, 20),
    gradientScale: randomFloat(0.1, 10),
  };
}

/**
 * Scroll text effect props schema
 * Renders scrolling text from right to left using an 8x8 bitmap font
 */
export default baseEffect
  .extend({
    name: z.literal('Scroll Text'),
    description: z.literal('Scrolling text marquee'),
    reset: z.boolean().optional().default(true).describe('Clear existing scroll text before adding new'),
    text: z.string().max(64).default("Hidey Ho! It's the Super-Happy-Fun-Time-Show!").describe('Text to scroll (max 64 chars)'),
    color: z.string().optional().default('#808000').describe('Text color (hex or named)'),
    accentColor: z.string().nullable().optional().default('#900000').describe('Optional accent/shadow color (hex or named)'),
    speed: z.number().min(1).max(500).optional().default(150).describe('Scroll speed in canvas pixels per second'),
    repeat: z.boolean().optional().default(false).describe('Restart scrolling when text exits left edge'),
    snapToLed: z.boolean().optional().default(true).describe('Snap scroll position to LED boundaries to reduce shimmer'),
    gradient: z
      .array(z.string().regex(/^#[0-9a-fA-F]{6}$/))
      .max(MAX_GRADIENT_COLORS)
      .optional()
      .describe('fieldType:gradientArray|Gradient colors for text animation'),
    gradientSpeed: z
      .number()
      .min(0.1)
      .max(20)
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
