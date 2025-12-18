/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

/**
 * Plasma effect props schema
 * Classic demoscene plasma effect using overlapping sine waves.
 * Fills the entire canvas with animated rainbow colors.
 * Renders on top of background with alpha blending.
 *
 * Note: Does not extend baseEffect because:
 * - 'reset' doesn't make sense for a singleton effect (use enabled: false instead)
 * - Plasma has similar semantics to background (on/off, not instances)
 */
export default z
  .object({
    speed: z
      .number()
      .min(0.1)
      .max(10)
      .optional()
      .default(2)
      .describe('Animation speed multiplier (1 = normal speed)'),
    scale: z
      .number()
      .min(0.1)
      .max(10)
      .optional()
      .default(3)
      .describe('Pattern frequency (0.1-10, higher = more detailed)'),
    colorShift: z
      .number()
      .min(-128)
      .max(128)
      .optional()
      .default(0)
      .describe('Hue offset (-128 to 128, shifts the color palette)'),
    enabled: z.boolean().optional().default(true).describe('Show or hide the plasma effect'),
  })
  .strict();
