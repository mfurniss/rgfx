/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

interface GradientPreset {
  name: string;
  gradient: string[];
  speed: number;
  scale: number;
}

export const gradientPresets: GradientPreset[] = [
  {
    name: 'Rainbow',
    gradient: ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000'],
    speed: 3,
    scale: 4,
  },
  {
    name: 'Sunset',
    gradient: ['#FF4500', '#FF6347', '#FFD700', '#FF8C00', '#8B0000'],
    speed: 3,
    scale: 4,
  },
  {
    name: 'Ocean',
    gradient: ['#001F3F', '#0074D9', '#7FDBFF', '#39CCCC'],
    speed: 3,
    scale: 4,
  },
  {
    name: 'Fire',
    gradient: ['#8B0000', '#FF0000', '#FF4500', '#FFD700', '#FFFF00'],
    speed: 3,
    scale: 4,
  },
  {
    name: 'Freaky',
    gradient: [
      '#000000', '#000000', '#000000', '#000000', '#00FF00', '#000000', '#000000',
      '#000000', '#000000', '#000000', '#000000', '#FF00FF', '#000000',
    ],
    speed: 4,
    scale: 2,
  },
  {
    name: 'Monochrome',
    gradient: ['#000000', '#A0A0A0', '#000000'],
    speed: 3,
    scale: 4,
  },
  {
    name: 'Neon',
    gradient: ['#FF00FF', '#00FFFF', '#FF00FF'],
    speed: 3,
    scale: 4,
  },
  {
    name: 'Lava',
    gradient: ['#400000', '#400000', '#FF4500', '#FFD700', '#400000'],
    speed: 3,
    scale: 4,
  },
];

export function findPresetByGradient(gradient: string[]): GradientPreset | undefined {
  return gradientPresets.find(
    (p) =>
      p.gradient.length === gradient.length &&
      p.gradient.every((color, i) => color === gradient[i]),
  );
}
