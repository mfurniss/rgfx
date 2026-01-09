/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { gradientPresets } from './gradient-presets';

interface PlasmaPreset {
  name: string;
  gradientName: string;
  speed: number;
  scale: number;
}

// Speed and scale values restored from commit a92c260
export const plasmaPresets: PlasmaPreset[] = [
  { name: 'Acid Haus', gradientName: 'Acid Haus', speed: 3, scale: 4 },
  { name: 'The Deep', gradientName: 'The Deep', speed: 1.5, scale: 1.5 },
  { name: 'Alien Goo', gradientName: 'Alien Goo', speed: 4, scale: 2 },
  { name: "McLeod's Clouds", gradientName: "McLeod's Clouds", speed: 0.8, scale: 1 },
  { name: 'Lime Dream', gradientName: 'Lime Dream', speed: 6, scale: 5 },
  { name: 'Lavarama', gradientName: 'Lavarama', speed: 3, scale: 4 },
  { name: 'Hot Fuzz', gradientName: 'Hot Fuzz', speed: 17, scale: 0.5 },
  { name: 'Statictastic', gradientName: 'Statictastic', speed: 15, scale: 10 },
  { name: 'Geode', gradientName: 'Geode', speed: 2.5, scale: 0.9 },
  { name: 'Stained Glass', gradientName: 'Stained Glass', speed: 1.4, scale: 1.9 },
  { name: 'Demoszene', gradientName: 'Demoszene', speed: 2.9, scale: 0.8 },
  { name: 'Call me Vic', gradientName: 'Call me Vic', speed: 2, scale: 0.35 },
  { name: 'Speculation', gradientName: 'Speculation', speed: 2, scale: 0.35 },
  { name: 'Hive Mind', gradientName: 'Hive Mind', speed: 3.25, scale: 7.83 },
  { name: 'Deaky-Freaky', gradientName: 'Deaky-Freaky', speed: 11.3, scale: 1.2 },
];

export function getGradientForPreset(preset: PlasmaPreset): string[] {
  const gradient = gradientPresets.find((g) => g.name === preset.gradientName);

  return gradient?.gradient ?? [];
}
