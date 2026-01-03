/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { baseEffect, easing } from './properties';

export function randomize(): Record<string, unknown> {
  return {};
}

/**
 * Pulse effect props schema
 * Creates a full-screen color pulse that fades out over time
 */
export default baseEffect
  .extend({
    name: z.literal('Pulse'),
    description: z.literal('Full-screen color pulse that fades out'),
    duration: z.number().positive().optional().default(800).describe('Effect duration in milliseconds'),
    easing: easing.optional().default('quinticOut'),
    fade: z.boolean().optional().default(true).describe('Fade out the effect over time'),
    collapse: z.enum(['horizontal', 'vertical', 'none', 'random']).optional().default('random').describe('Direction the pulse collapses'),
  })
  .strict();
