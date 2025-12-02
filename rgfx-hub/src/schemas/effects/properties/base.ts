/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import color from './color';

/**
 * Base effect schema with properties common to all effects
 * All effect schemas should extend this using .extend()
 */
export default z.object({
  color,
  reset: z.boolean().optional().default(false),
});
