/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

import { baseEffect } from './properties';

/**
 * Text effect props schema
 * Renders text using an 8x8 bitmap font
 */
export default baseEffect
  .extend({
    name: z.literal('Text'),
    description: z.literal('Static text display'),
    reset: z.boolean().optional().default(true).describe('Clear existing text before rendering'),
    text: z.string().max(32).default('Hello you!').describe('Text to render (max 32 chars)'),
    color: z.string().optional().default('#FF0000').describe('Text color (hex or named)'),
    accentColor: z.string().optional().default('#0000A0').describe('Optional accent/shadow color (hex or named)'),
    x: z.number().int().optional().default(0).describe('X position in canvas coordinates'),
    y: z.number().int().optional().default(0).describe('Y position in canvas coordinates'),
    align: z.enum(['left', 'center', 'right']).optional().default('left').describe('Horizontal alignment (overrides x when center or right)'),
    duration: z.number().int().min(0).optional().default(3000).describe('Duration in ms (0 = infinite, use reset to clear)'),
  })
  .strict();
