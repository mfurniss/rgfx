/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { baseEffect } from './properties';
import { randomColor, randomFloat, randomInt, randomString } from '@/utils/random';
import { roundFloat } from '@/utils/math';
import defaults from './defaults.json';

const d = defaults.projectile;

export function randomize(): Record<string, unknown> {
  return {
    color: randomColor(0.5),
    direction: randomString(['left', 'right']),
    velocity: randomInt(500, 3000),
    friction: roundFloat(randomFloat(8) - 4),
    trail: randomInt(1) ? randomFloat(0, 1) : 0,
    width: randomInt(4, 64),
    height: randomInt(4, 64),
    particleDensity: randomInt(1) ? randomInt(30, 80) : 0,
  };
}

/**
 * Projectile effect props schema
 * Creates a rectangular object that moves from one edge to the opposite edge
 */
export default baseEffect
  .extend({
    name: z.literal('Projectile'),
    description: z.literal('Animated projectile moving across display'),
    direction: z.enum(['left', 'right', 'up', 'down', 'random']).optional()
      .default(d.direction as 'random')
      .describe('Direction of travel'),
    velocity: z.number().min(1).max(5000).optional().default(d.velocity)
      .describe('Initial speed in pixels/second'),
    friction: z.number().optional().default(d.friction)
      .describe('Friction (0=none, positive=decel, negative=accel)'),
    trail: z.number().min(0).optional().default(d.trail)
      .describe('Trail multiplier (0=none, 1=velocity length)'),
    width: z.number().int().min(1).max(64).optional().default(d.width)
      .describe('Width in pixels'),
    height: z.number().int().min(1).max(64).optional().default(d.height)
      .describe('Height in pixels'),
    lifespan: z.number().min(100).max(30000).optional()
      .default(d.lifespan)
      .describe('Max duration in milliseconds'),
    particleDensity: z.number().min(0).max(100).optional()
      .default(d.particleDensity)
      .describe('% chance per frame to emit particle (0 = disabled)'),
  })
  .strict();
