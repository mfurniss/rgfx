/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { effectSchemas } from '@/schemas';

// Build map of effect keys to display names from schema literals
// Extract literal value from z.literal() schema via internal _zod.def.values
export const effectDisplayNames = Object.fromEntries(
  Object.entries(effectSchemas).map(([key, schema]) => {
    const nameSchema = schema.shape.name as { _zod: { def: { values: string[] } } };
    return [key, nameSchema._zod.def.values[0]];
  }),
);

// Sort by display name for a more intuitive list
export const formEffects = Object.keys(effectSchemas).sort((a, b) =>
  effectDisplayNames[a].localeCompare(effectDisplayNames[b]),
);
