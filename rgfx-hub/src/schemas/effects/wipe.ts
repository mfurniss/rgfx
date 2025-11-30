/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

import { color } from './properties';

/**
 * Wipe effect props schema
 * Creates a color wipe that sweeps across the display
 */
export default z
  .object({
    color,
    direction: z.enum(['left', 'right', 'up', 'down', 'random']).optional().default('random'),
    duration: z.number().positive().optional().default(500),
  })
  .strict();
