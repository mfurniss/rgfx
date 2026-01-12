/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import color from './properties/color';
import { randomString, randomInt, randomFloat, randomColor } from '@/utils/random';

export function randomize(): Record<string, unknown> {
  return {
    color: randomColor(0.25),
    direction: randomString(['up', 'down', 'left', 'right']),
    density: randomInt(5, 100),
    speed: randomFloat(10, 500),
    size: randomInt(4, 16),
  };
}

/**
 * Particle Field effect props schema
 * Creates a field of moving particles for starfields, rain, snow, etc.
 * Singleton effect - only one particle field active at a time.
 * Slower particles appear dimmer to simulate distance.
 *
 * Note: Does not extend baseEffect because:
 * - 'reset' doesn't make sense for a singleton effect (use enabled: 'off' instead)
 * - Particle field has similar semantics to background/plasma (on/off, not instances)
 */
export default z
  .object({
    name: z.literal('Particle Field'),
    description: z.literal('Moving particles for starfields, rain, snow effects'),
    direction: z
      .enum(['up', 'down', 'left', 'right'])
      .optional()
      .default('left')
      .describe('Particle movement direction (up/down maps to left/right on strips)'),
    density: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .default(20)
      .describe('Number of active particles (1-100)'),
    speed: z
      .number()
      .min(10)
      .max(1000)
      .optional()
      .default(50)
      .describe('Base particle speed in pixels/second (individual particles vary)'),
    size: z
      .number()
      .int()
      .min(1)
      .max(16)
      .optional()
      .default(4)
      .describe('Particle size in canvas pixels'),
    color,
    enabled: z
      .enum(['off', 'on', 'fadeIn', 'fadeOut'])
      .optional()
      .default('on')
      .describe('off: instant off, on: instant on, fadeIn: fade in over 1s, fadeOut: fade out over 1s'),
  })
  .strict();
