/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

import { baseEffect, centerX, centerY } from './properties';

/**
 * Explode effect props schema
 * Creates a particle explosion effect from a center point
 */
export default baseEffect
  .extend({
    centerX,
    centerY,
    friction: z.number().min(0).max(50).optional().default(3.0).describe('Air resistance slowing particles'),
    hueSpread: z.number().int().min(0).max(359).optional().default(0).describe('Color variation in degrees'),
    lifespan: z.number().positive().optional().default(700).describe('Particle lifetime in milliseconds'),
    lifespanSpread: z.number().positive().optional().default(1.6).describe('Randomness multiplier for lifespan'),
    particleCount: z.number().int().min(1).max(500).optional().default(100).describe('Number of particles to spawn'),
    particleSize: z.number().int().min(1).max(16).optional().default(6).describe('Size of each particle in pixels'),
    power: z.number().min(1).max(1000).optional().default(70).describe('Initial velocity of particles'),
    powerSpread: z.number().positive().optional().default(1.6).describe('Randomness multiplier for power'),
  })
  .strict();
