/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import pulseSchema from './pulse';
import wipeSchema from './wipe';
import explodeSchema from './explode';
import bitmapSchema from './bitmap';
import backgroundSchema from './background';
import projectileSchema from './projectile';
import textSchema from './text';
import scrollTextSchema from './scroll_text';
import plasmaSchema from './plasma';

/**
 * Map of effect names to their schemas
 */
export const effectSchemas = {
  pulse: pulseSchema,
  wipe: wipeSchema,
  explode: explodeSchema,
  bitmap: bitmapSchema,
  background: backgroundSchema,
  projectile: projectileSchema,
  text: textSchema,
  scroll_text: scrollTextSchema,
  plasma: plasmaSchema,
} as const;

type EffectName = keyof typeof effectSchemas;

// Union type of all effect props (used internally for return types)
type EffectProps =
  | z.infer<typeof pulseSchema>
  | z.infer<typeof wipeSchema>
  | z.infer<typeof explodeSchema>
  | z.infer<typeof bitmapSchema>
  | z.infer<typeof backgroundSchema>
  | z.infer<typeof projectileSchema>
  | z.infer<typeof textSchema>
  | z.infer<typeof scrollTextSchema>
  | z.infer<typeof plasmaSchema>;

/**
 * Check if a string is a valid effect name
 */
export function isEffectName(effect: string): effect is EffectName {
  return effect in effectSchemas;
}


/**
 * Safe version that returns a result object instead of throwing
 */
export function safeValidateEffectProps(
  effect: string,
  props: unknown,
): { success: true; data: EffectProps } | { success: false; error: z.ZodError } {
  if (!isEffectName(effect)) {
    return {
      success: false,
      error: new z.ZodError([
        {
          code: 'custom',
          message: `Unknown effect type: ${effect}`,
          path: ['effect'],
        },
      ]),
    };
  }
  const result = effectSchemas[effect].safeParse(props);

  if (result.success) {
    return { success: true, data: result.data as EffectProps };
  }
  return { success: false, error: result.error };
}
