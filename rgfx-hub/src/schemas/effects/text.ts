/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { baseEffect, colorGradient } from './properties';
import { randomColor, randomString, randomFloat, randomInt, randomGradient } from '@/utils/random';

export function randomize(): Record<string, unknown> {
  const props: Record<string, unknown> = {
    text: randomString(['Hello You!', 'AaBbCcDd', '0123456789', '*** RGFX ***']),
    color: randomColor(0.2),
    accentColor: randomInt(1) ? randomColor() : null,
    duration: randomInt(3, 5) * 1000,
  };

  if (randomInt(1)) {
    props.colorGradient = {
      colors: randomGradient(0.2),
      speed: randomFloat(0.1, 20),
      scale: randomFloat(0.1, 10),
    };
  }

  return props;
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
    colorGradient: colorGradient.default({
      colors: ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000'],
      speed: 3,
      scale: 4,
    }),
  })
  .strict();
