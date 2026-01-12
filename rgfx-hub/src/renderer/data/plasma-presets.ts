/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { gradientPresets } from './gradient-presets';

interface PlasmaPreset {
  name: string;
  speed: number;
  scale: number;
}

export const plasmaPresets: PlasmaPreset[] = [
  { name: 'Acid Haus', speed: 3, scale: 4 },
  { name: 'The Deep', speed: 1.5, scale: 1.5 },
  { name: 'Alien Goo', speed: 4, scale: 2 },
  { name: "McLeod's Clouds", speed: 0.8, scale: 1 },
  { name: 'Lime Dream', speed: 6, scale: 5 },
  { name: 'Lavarama', speed: 3, scale: 4 },
  { name: 'Hot Fuzz', speed: 17, scale: 0.5 },
  { name: 'Statictastic', speed: 15, scale: 10 },
  { name: 'Deaky-Freaky', speed: 11.3, scale: 0.9 },
  { name: 'Geode', speed: 2.5, scale: 0.9 },
  { name: 'We ❤️ The 80s', speed: 10, scale: 3.8 },
  { name: 'Stained Glass', speed: 1.4, scale: 1.9 },
  { name: 'Demoszene', speed: 2.9, scale: 0.8 },
  { name: 'Call me Vic', speed: 2, scale: 0.35 },
  { name: 'Speculation', speed: 2, scale: 0.35 },
  { name: 'Hive Mind', speed: 3.25, scale: 7.83 },
  { name: 'Candy Apple', speed: 2.6, scale: 1.2 },
];

export function getGradientForPreset(preset: PlasmaPreset): string[] {
  const gradient = gradientPresets.find((g) => g.name === preset.name);
  return gradient?.gradient ?? [];
}
