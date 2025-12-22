/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

type ZodShape = Record<string, z.ZodType>;

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random color (either named or hex)
 */
function randomColor(): string {
  // 50% chance of named color, 50% chance of hex color
  if (Math.random() < 0.5) {
    const namedColors = [
      'red',
      'orange',
      'yellow',
      'green',
      'cyan',
      'blue',
      'purple',
      'magenta',
      'white',
      'random',
    ];
    return namedColors[Math.floor(Math.random() * namedColors.length)];
  }

  // Generate random hex color from 0x000000 to 0xFFFFFF
  const randomHex = Math.floor(Math.random() * 0x1000000);
  return `#${randomHex.toString(16).padStart(6, '0')}`;
}

/**
 * Generate random parameters for explode effect
 */
function randomizeExplode(): Record<string, unknown> {
  return {
    color: randomColor(),
    reset: false,
    centerX: 50,
    centerY: 50,
    friction: randomInt(0, 20),
    hueSpread: randomInt(0, 359),
    lifespan: randomInt(100, 3000),
    lifespanSpread: randomInt(0, 100),
    particleCount: randomInt(10, 500),
    particleSize: randomInt(1, 16),
    power: randomInt(0, 1000),
    powerSpread: randomInt(0, 100),
  };
}

/**
 * Randomize effect properties based on effect name
 */
export function randomizeEffectProps(_schema: z.ZodObject<ZodShape>): Record<string, unknown> {
  // For now, we only support explode
  // TODO: Add randomization functions for other effects
  return randomizeExplode();
}
