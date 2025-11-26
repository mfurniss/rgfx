/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

/**
 * Pulse effect props schema
 * Creates a full-screen color pulse that fades out over time
 */
export default z
  .object({
    color: z.union([z.string(), z.number()]).optional().default('random'),
    duration: z.number().positive().optional().default(1000),
    fade: z.boolean().optional().default(true),
    easing: z.string().optional().default('quadraticOut'),
  })
  .strict();
