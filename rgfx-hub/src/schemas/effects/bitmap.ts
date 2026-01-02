/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';
import { baseEffect, centerX, centerY, easing } from './properties';

/**
 * PICO-8 default palette - 16 colors designed for retro games
 * @see https://lospec.com/palette-list/pico-8
 */
const PICO8_PALETTE = [
  '#000000', // 0: Black
  '#1D2B53', // 1: Dark Blue
  '#7E2553', // 2: Dark Purple
  '#008751', // 3: Dark Green
  '#AB5236', // 4: Brown
  '#5F574F', // 5: Dark Gray
  '#C2C3C7', // 6: Light Gray
  '#FFF1E8', // 7: White
  '#FF004D', // 8: Red
  '#FFA300', // 9: Orange
  '#FFEC27', // A: Yellow
  '#00E436', // B: Green
  '#29ADFF', // C: Blue
  '#83769C', // D: Lavender
  '#FF77A8', // E: Pink
  '#FFCCAA', // F: Peach
];

// Hex color string for palette entries
const paletteColorSchema = z.string().regex(/^#?[0-9a-fA-F]{6}$/, 'Invalid hex color format');

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
    reset: z.boolean().optional().default(false),
    centerX: centerX.default('random').describe('fieldType:centerXY|Start X position (0-100 or random)'),
    centerY: centerY.default('random').describe('fieldType:centerXY|Start Y position (0-100 or random)'),
    endX: centerX.default('random').describe('fieldType:centerXY|End X position (0-100 or random)'),
    endY: centerY.default('random').describe('fieldType:centerXY|End Y position (0-100 or random)'),
    duration: z.number().positive().optional().default(1500),
    easing: easing.optional().default('quadraticInOut'),
    fadeIn: z.number().int().nonnegative().optional().default(300)
      .describe('Fade in duration in milliseconds'),
    fadeOut: z.number().int().nonnegative().optional().default(300)
      .describe('Fade out duration in milliseconds'),
    palette: z
      .array(paletteColorSchema)
      .min(1)
      .max(16)
      .optional()
      .default(PICO8_PALETTE)
      .describe('fieldType:hidden|Array of up to 16 hex colors for palette indices 0-F'),
    frameRate: z.number().positive().optional().default(2)
      .describe('Animation frame rate in frames per second'),
    images: z
      .array(z.array(z.string()))
      .describe('fieldType:spritePreset|Sprite animation frames')
      .default([[
        '.......A........',
        '......AAA.......',
        '....BBBBBAAAA...',
        '...BBBBBBBAA....',
        '..B7B77BBBB.....',
        '..70B077BBBAAA..',
        '..70B077BBBBA...',
        '.B70B077AABB....',
        '.A70B077AAABAA..',
        '.BB7B77BA0BBA...',
        '..0070000BEB....',
        '..BBBBBBBEEEB...',
        '...7777BEEEEB...',
        '..777777BEEBBA..',
        'EEE777EEBBBBBBA.',
        '.EE77EEEEEBBBBBB',
      ]]),
  })
  .strict();
