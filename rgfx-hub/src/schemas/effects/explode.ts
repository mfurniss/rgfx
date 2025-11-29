/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

import { color } from './properties';

/**
 * Explode effect props schema
 * Creates a particle explosion effect from a center point
 */
export default z
  .object({
    color,
    particleCount: z.number().int().min(1).max(500).optional().default(100),
    power: z.number().positive().optional().default(50),
    lifespan: z.number().positive().optional().default(800),
    powerSpread: z.number().positive().optional().default(1.6),
    particleSize: z.number().int().positive().optional().default(2),
    hueSpread: z.number().int().min(0).max(359).optional().default(40),
    friction: z.number().positive().optional().default(2.0),
    lifespanSpread: z.number().positive().optional().default(1.3),
    centerX: z.number().min(0).max(100).optional().default(50),
    centerY: z.number().min(0).max(100).optional().default(50),
  })
  .strict();
