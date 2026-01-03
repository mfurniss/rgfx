/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

import { baseEffect, colorGradient } from './properties';

export function randomize(): Record<string, unknown> {
  return {};
}

/**
 * Scroll text effect props schema
 * Renders scrolling text from right to left using an 8x8 bitmap font
 */
export default baseEffect
  .extend({
    name: z.literal('Scroll Text'),
    description: z.literal('Scrolling text marquee'),
    reset: z.boolean().optional().default(true).describe('Clear existing scroll text before adding new'),
    text: z.string().max(64).default("Hidey Ho! It's the Super-Happy-Fun-Time-Show!").describe('Text to scroll (max 64 chars)'),
    color: z.string().optional().default('#808000').describe('Text color (hex or named)'),
    accentColor: z.string().optional().describe('Optional accent/shadow color (hex or named)'),
    y: z.number().int().optional().default(0).describe('Y position in canvas coordinates'),
    speed: z.number().min(1).max(500).optional().default(150).describe('Scroll speed in canvas pixels per second'),
    repeat: z.boolean().optional().default(false).describe('Restart scrolling when text exits left edge'),
    snapToLed: z.boolean().optional().default(true).describe('Snap scroll position to LED boundaries to reduce shimmer'),
    colorGradient,
  })
  .strict();
