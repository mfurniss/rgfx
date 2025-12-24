/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

import { baseEffect } from './properties';

/**
 * Projectile effect props schema
 * Creates a rectangular object that moves from one edge to the opposite edge
 */
export default baseEffect
  .extend({
    name: z.literal('Projectile'),
    description: z.literal('Animated projectile moving across display'),
    direction: z.enum(['left', 'right', 'up', 'down', 'random']).optional().default('random').describe('Direction of travel'),
    velocity: z.number().min(1).max(5000).optional().default(1200).describe('Initial speed in pixels/second'),
    friction: z.number().optional().default(0.5).describe('Friction (0=none, positive=decel, negative=accel)'),
    trail: z.number().min(0).optional().default(0.2).describe('Trail multiplier (0=none, 1=velocity length)'),
    width: z.number().int().min(1).max(64).optional().default(16).describe('Width in pixels'),
    height: z.number().int().min(1).max(64).optional().default(6).describe('Height in pixels'),
    lifespan: z.number().min(100).max(30000).optional().default(5000).describe('Max duration in milliseconds'),
  })
  .strict();
