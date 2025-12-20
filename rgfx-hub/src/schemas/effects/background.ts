/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

import color from './properties/color';

/**
 * Background effect props schema
 * Creates a solid color background that fills the entire canvas.
 * Singleton behavior: new background replaces any existing one.
 * Renders FIRST, before all other effects.
 *
 * Note: Does not extend baseEffect because:
 * - 'reset' doesn't make sense for a singleton effect (use enabled: false instead)
 * - Background has different semantics than animated effects
 */
export default z
  .object({
    name: z.literal('Background'),
    description: z.literal('Solid color background fill'),
    color: color.describe('Background color (not needed when enabled is false)'),
    enabled: z.boolean().optional().default(true).describe('Show or hide the background'),
  })
  .strict();
