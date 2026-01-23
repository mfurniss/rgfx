/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

/**
 * LED Hardware schema - validates LED hardware definition files
 * Stored in led-hardware/ directory
 */
export const LEDHardwareSchema = z.object({
  description: z.string().optional(),
  sku: z.string().nullable(),
  asin: z.string().nullable().optional(),
  layout: z.string(),
  count: z.number().positive(),
  chipset: z.string().optional(),
  colorOrder: z.string().optional(),
  colorCorrection: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

