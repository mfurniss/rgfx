/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { baseEffect } from './properties';
import { randomColor, randomInt, randomString } from '@/utils/random';
import defaults from './defaults.json';

const d = defaults.wipe;

export function randomize(): Record<string, unknown> {
  return {
    color: randomColor(0.3, 0.5),
    duration: randomInt(300, 1000),
    direction: randomString(['left', 'right', 'up', 'down', 'random']),
    blendMode: randomString(['additive', 'replace']),
  };
}

/**
 * Wipe effect props schema
 * Creates a color wipe that sweeps across the display
 */
export default baseEffect
  .extend({
    name: z.literal('Wipe'),
    description: z.literal('Directional color wipe across the display'),
    direction: z.enum(['left', 'right', 'up', 'down', 'random']).optional()
      .default(d.direction as 'random')
      .describe('Direction of the wipe animation'),
    duration: z.number().positive().optional().default(d.duration)
      .describe('Effect duration in milliseconds'),
    blendMode: z.enum(['additive', 'replace']).optional()
      .default(d.blendMode as 'additive')
      .describe('Blend mode for rendering'),
  })
  .strict();
