/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { hslToHex } from './color';

// Mulberry32 PRNG - fast, simple, good distribution
// Returns a function that generates numbers in [0, 1)
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rng: () => number = Math.random;

/**
 * Seed the random number generator for deterministic output.
 * Call with no argument to reset to Math.random.
 */
export function seedRandom(seed?: number): void {
  rng = seed !== undefined ? mulberry32(seed) : Math.random;
}

export function randomInt(min: number, max?: number): number {
  if (max === undefined) {
    return Math.round(randomFloat(0, min));
  }
  return Math.round(randomFloat(min, max));
}

export function randomFloat(min: number, max?: number): number {
  if (max === undefined) {
    return Math.round(rng() * min * 100) / 100;
  }
  return Math.round((min + rng() * (max - min)) * 100) / 100;
}

export function randomString<T extends string>(options: T[]): T {
  return options[randomInt(0, options.length - 1)];
}

export function randomColor(minL = 0): string {
  const h = randomInt(0, 359);
  const s = randomFloat(0, 1);
  const l = randomFloat(minL, 1);
  return hslToHex(h, s, l);
}

export function randomGradient(minLume = 0, maxColors = 20): string[] {
  const gradient = [];

  for (let i = 0; i < randomInt(1, maxColors); i++ ) {
    gradient.push(randomColor(minLume));
  }

  if (gradient.length > 2) {
    gradient.push(gradient[0]);
  }

  return gradient;
}
