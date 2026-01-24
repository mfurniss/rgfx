/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import pulseSchema, { randomize as randomizePulse } from './pulse';
import wipeSchema, { randomize as randomizeWipe } from './wipe';
import explodeSchema, { randomize as randomizeExplode } from './explode';
import bitmapSchema, { randomize as randomizeBitmap } from './bitmap';
import backgroundSchema, { randomize as randomizeBackground, presetConfig as backgroundPresetConfig } from './background';
import projectileSchema, { randomize as randomizeProjectile } from './projectile';
import textSchema, { randomize as randomizeText, presetConfig as textPresetConfig } from './text';
import scrollTextSchema, { randomize as randomizeScrollText, presetConfig as scrollTextPresetConfig } from './scroll-text';
import plasmaSchema, { randomize as randomizePlasma, presetConfig as plasmaPresetConfig } from './plasma';
import warpSchema, { randomize as randomizeWarp, presetConfig as warpPresetConfig } from './warp';
import particleFieldSchema, { randomize as randomizeParticleField } from './particle-field';
import type { PresetConfig } from './preset-config';

export type { PresetData, PresetType } from './preset-config';

/**
 * Map of effect names to their full schemas (includes name/description metadata)
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
  warp: warpSchema,
  particle_field: particleFieldSchema,
} as const;

/**
 * Map of effect names to props-only schemas (metadata stripped)
 * Use these for runtime values sent to drivers.
 */
export const effectPropsSchemas = {
  pulse: pulseSchema.omit({ name: true, description: true }),
  wipe: wipeSchema.omit({ name: true, description: true }),
  explode: explodeSchema.omit({ name: true, description: true }),
  bitmap: bitmapSchema.omit({ name: true, description: true }),
  background: backgroundSchema.omit({ name: true, description: true }),
  projectile: projectileSchema.omit({ name: true, description: true }),
  text: textSchema.omit({ name: true, description: true }),
  scroll_text: scrollTextSchema.omit({ name: true, description: true }),
  plasma: plasmaSchema.omit({ name: true, description: true }),
  warp: warpSchema.omit({ name: true, description: true }),
  particle_field: particleFieldSchema.omit({ name: true, description: true }),
} as const;

export const effectRandomizers = {
  pulse: randomizePulse,
  wipe: randomizeWipe,
  explode: randomizeExplode,
  bitmap: randomizeBitmap,
  background: randomizeBackground,
  projectile: randomizeProjectile,
  text: randomizeText,
  scroll_text: randomizeScrollText,
  plasma: randomizePlasma,
  warp: randomizeWarp,
  particle_field: randomizeParticleField,
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
  | z.infer<typeof plasmaSchema>
  | z.infer<typeof warpSchema>
  | z.infer<typeof particleFieldSchema>;

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
  const result = effectPropsSchemas[effect].safeParse(props);

  if (result.success) {
    return { success: true, data: result.data as EffectProps };
  }
  return { success: false, error: result.error };
}

/**
 * Map of effect names to their preset configurations.
 * Only effects with gradient/plasma preset support are included.
 */
export const effectPresetConfigs: Record<string, PresetConfig> = {
  plasma: plasmaPresetConfig,
  warp: warpPresetConfig,
  background: backgroundPresetConfig,
  text: textPresetConfig,
  scroll_text: scrollTextPresetConfig,
};
