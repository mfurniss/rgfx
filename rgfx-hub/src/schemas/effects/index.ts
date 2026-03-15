import { z } from 'zod';
import pulseSchema, { randomize as randomizePulse, cleanCodeProps as pulseCleanCodeProps } from './pulse';
import wipeSchema, { randomize as randomizeWipe, cleanCodeProps as wipeCleanCodeProps } from './wipe';
import explodeSchema, { randomize as randomizeExplode, fieldTypes as explodeFieldTypes, cleanCodeProps as explodeCleanCodeProps } from './explode';
import bitmapSchema, { randomize as randomizeBitmap, fieldTypes as bitmapFieldTypes, layoutConfig as bitmapLayoutConfig, generateCode as bitmapGenerateCode, cleanCodeProps as bitmapCleanCodeProps, formDefaults as bitmapFormDefaults } from './bitmap';
import backgroundSchema, { randomize as randomizeBackground, presetConfig as backgroundPresetConfig, fieldTypes as backgroundFieldTypes } from './background';
import projectileSchema, { randomize as randomizeProjectile, cleanCodeProps as projectileCleanCodeProps } from './projectile';
import textSchema, { randomize as randomizeText, presetConfig as textPresetConfig, fieldTypes as textFieldTypes, layoutConfig as textLayoutConfig, cleanCodeProps as textCleanCodeProps } from './text';
import scrollTextSchema, { scrollTextBaseSchema, randomize as randomizeScrollText, presetConfig as scrollTextPresetConfig, fieldTypes as scrollTextFieldTypes, layoutConfig as scrollTextLayoutConfig, cleanCodeProps as scrollTextCleanCodeProps } from './scroll-text';
import plasmaSchema, { randomize as randomizePlasma, presetConfig as plasmaPresetConfig, fieldTypes as plasmaFieldTypes } from './plasma';
import warpSchema, { randomize as randomizeWarp, presetConfig as warpPresetConfig, fieldTypes as warpFieldTypes } from './warp';
import particleFieldSchema, { randomize as randomizeParticleField } from './particle-field';
import sparkleSchema, { randomize as randomizeSparkle, fieldTypes as sparkleFieldTypes, cleanCodeProps as sparkleCleanCodeProps } from './sparkle';
import videoSchema, { fieldTypes as videoFieldTypes, layoutConfig as videoLayoutConfig } from './video';
import type { FieldTypeMap } from '@/renderer/utils/zod-introspection';
import type { CodeGenerator, CodePropsTransform } from '@/renderer/pages/effects-playground/utils/code-generator';

/**
 * Layout configuration for effect forms.
 * Each inner array represents a column with stacked fields.
 * All columns use responsive width: xs=12 (full width on mobile), md=6 (half width on desktop)
 */
export type LayoutConfig = string[][];

export interface PresetData {
  gradient: string[];
  speed?: number;
  scale?: number;
}

export type PresetType = 'plasma' | 'gradient';

export interface PresetConfig {
  type: PresetType;
  apply: (
    presetData: PresetData,
    currentValues: Record<string, unknown>,
  ) => Record<string, unknown>;
}

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
  sparkle: sparkleSchema,
  video: videoSchema,
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
  scroll_text: scrollTextBaseSchema.omit({ name: true, description: true }),
  plasma: plasmaSchema.omit({ name: true, description: true }),
  warp: warpSchema.omit({ name: true, description: true }),
  particle_field: particleFieldSchema.omit({ name: true, description: true }),
  sparkle: sparkleSchema.omit({ name: true, description: true }),
  video: videoSchema.omit({ name: true, description: true }),
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
  sparkle: randomizeSparkle,
  video: () => ({}),
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
  | z.infer<typeof particleFieldSchema>
  | z.infer<typeof sparkleSchema>
  | z.infer<typeof videoSchema>;

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

/**
 * Map of effect names to their field type overrides.
 * Used by EffectForm to render the correct UI components.
 * Effects not listed here use inferred types from their schemas.
 */
export const effectFieldTypes: Record<string, FieldTypeMap | undefined> = {
  explode: explodeFieldTypes,
  bitmap: bitmapFieldTypes,
  background: backgroundFieldTypes,
  text: textFieldTypes,
  scroll_text: scrollTextFieldTypes,
  plasma: plasmaFieldTypes,
  warp: warpFieldTypes,
  sparkle: sparkleFieldTypes,
  video: videoFieldTypes,
};

/**
 * Map of effect names to their form layout configurations.
 * Effects not listed here use the default flat 2-column layout.
 */
export const effectLayoutConfigs: Record<string, LayoutConfig | undefined> = {
  bitmap: bitmapLayoutConfig,
  text: textLayoutConfig,
  scroll_text: scrollTextLayoutConfig,
  video: videoLayoutConfig,
};

/**
 * Extra form defaults for the playground UI (not schema defaults).
 * Merged on top of schema.parse({}) when initializing the form.
 */
export const effectFormDefaults: Record<string, Record<string, unknown> | undefined> = {
  bitmap: bitmapFormDefaults,
};

/**
 * Map of effect names to custom code generators.
 * When present and returning a string, bypasses the generic broadcast template.
 */
export const effectCodeGenerators: Record<string, CodeGenerator | undefined> = {
  bitmap: bitmapGenerateCode,
};

/**
 * Map of effect names to prop transformers for code preview.
 * Applied before code generation to strip irrelevant props.
 */
export const effectCodePropsTransforms: Record<string, CodePropsTransform | undefined> = {
  pulse: pulseCleanCodeProps,
  wipe: wipeCleanCodeProps,
  explode: explodeCleanCodeProps,
  bitmap: bitmapCleanCodeProps,
  projectile: projectileCleanCodeProps,
  text: textCleanCodeProps,
  scroll_text: scrollTextCleanCodeProps,
  sparkle: sparkleCleanCodeProps,
};
