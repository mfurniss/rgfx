/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { hslToHex } from './color';

export function randomInt(min: number, max?: number): number {
  if (max === undefined) {
    return Math.round(randomFloat(0, min));
  }
  return Math.round(randomFloat(min, max));
}

export function randomFloat(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

export function randomString<T extends string>(options: T[]): T {
  return options[randomInt(0, options.length - 1)];
}

export function randomColor(minL = 0.2): string {
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
