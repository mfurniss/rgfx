/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { baseEffect, centerX, centerY, easing } from './properties';
import type { FieldTypeMap } from '@/renderer/utils/zod-introspection';
import { randomInt } from '@/utils/random';
import { spritePresets } from '@/utils/sprite-presets';
import defaults from './defaults.json';

const d = defaults.bitmap;

export const fieldTypes: FieldTypeMap = {
  centerX: 'centerXY',
  centerY: 'centerXY',
  endX: 'centerXY',
  endY: 'centerXY',
  palette: 'hidden',
  images: 'spritePreset',
};

export function randomize(): Record<string, unknown> {
  // Randomly select one of the sprite presets
  const randomPreset = spritePresets[randomInt(0, spritePresets.length - 1)];

  return {
    images: [randomPreset.image], // Wrap in array for multi-frame format
  };
}

// Hex color string for palette entries
const paletteColorSchema = z.string().regex(
  /^#?[0-9a-fA-F]{6}$/,
  'Invalid hex color format',
);

/**
 * Bitmap effect props schema
 * Displays animated bitmap sprites on the LED matrix
 *
 * Images format:
 * - Array of frames, each frame is an array of row strings
 * - If multiple frames provided, cycles through them at frameRate FPS
 * - Each frame can have different dimensions (always centered on coords)
 *
 * Pixel format:
 * - Space or '.' = transparent pixel
 * - '0'-'9' = palette index 0-9
 * - 'A'-'F' (case insensitive) = palette index 10-15
 */
export default baseEffect
  .omit({ color: true })
  .extend({
    name: z.literal('Bitmap'),
    description: z.literal('Display a bitmap image'),
    reset: z.boolean().optional().default(d.reset),
    centerX: centerX.default(d.centerX as 'random')
      .describe('Start X position (0-100 or random)'),
    centerY: centerY.default(d.centerY as 'random')
      .describe('Start Y position (0-100 or random)'),
    endX: centerX.describe('End X position (0-100 or random)'),
    endY: centerY.describe('End Y position (0-100 or random)'),
    duration: z.number().positive().optional().default(d.duration),
    easing: easing.optional().default(d.easing as 'quadraticInOut'),
    fadeIn: z.number().int().nonnegative().optional().default(d.fadeIn)
      .describe('Fade in duration in milliseconds'),
    fadeOut: z.number().int().nonnegative().optional().default(d.fadeOut)
      .describe('Fade out duration in milliseconds'),
    palette: z
      .array(paletteColorSchema)
      .min(1)
      .max(16)
      .optional()
      .default(d.palette)
      .describe('Array of up to 16 hex colors for palette indices 0-F'),
    frameRate: z.number().positive().optional().default(d.frameRate)
      .describe('Animation frame rate in frames per second'),
    images: z
      .array(z.array(z.string()))
      .describe('Sprite animation frames')
      .default(d.images),
  })
  .strict();
