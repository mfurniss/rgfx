/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { color } from './properties';

/**
 * Bitmap effect props schema
 * Displays a bitmap image on the LED matrix
 */
export default z
  .object({
    color,
    duration: z.number().positive().optional().default(400),
    image: z
      .array(z.string())
      .default([
        '     XXXXXX     ',
        '   XXXXXXXXXX   ',
        '  XXXXXXXXXXXX  ',
        ' XXXXXXXXXXX    ',
        ' XXXXXXXXXX     ',
        'XXXXXXXXX       ',
        'XXXXXXXX        ',
        'XXXXXXX         ',
        'XXXXXXX         ',
        'XXXXXXXX        ',
        'XXXXXXXXX       ',
        ' XXXXXXXXXX     ',
        ' XXXXXXXXXXX    ',
        '  XXXXXXXXXXXX  ',
        '   XXXXXXXXXX   ',
        '     XXXXXX     ',
      ]),
  })
  .strict();
