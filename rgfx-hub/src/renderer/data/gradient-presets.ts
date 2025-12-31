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
    name: 'Acid Haus',
    gradient: ['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000'],
    speed: 3,
    scale: 4,
  },
  {
    name: 'The Deep',
    gradient: ['#002851', '#003e74', '#12706d', '#00424a', '#00473c', '#002851'],
    speed: 1.5,
    scale: 1.5,
  },
  {
    name: 'Alien Goo',
    gradient: [
      '#000000', '#000000', '#000000', '#000000', '#00FF00', '#000000', '#000000',
      '#000000', '#000000', '#000000', '#000000', '#FF00FF', '#000000',
    ],
    speed: 4,
    scale: 2,
  },
  {
    name: 'McLeod\'s Clouds',
    gradient: ['#408080', '#408080', '#B0B0B0', '#408080', '#408080'],
    speed: 0.8,
    scale: 1,
  },
  {
    name: 'Lime Dream',
    gradient: ['#700070', '#B0FF00', '#300050', '#700070'],
    speed: 6,
    scale: 5,
  },
  {
    name: 'Lavarama',
    gradient: ['#400000', '#400000', '#FF4500', '#FFD700', '#400000'],
    speed: 3,
    scale: 4,
  },
  {
    name: 'Hot Fuzz',
    gradient: ['#FF0000', '#000000', '#000000', '#0000FF'],
    speed: 17,
    scale: 0.5,
  },
  {
    name: 'Statictastic',
    gradient: [
      '#000000', '#808080', '#000000', '#000000', '#B0B0B0', '#000000', '#000000', '#707070',
      '#000000', '#000000', '#808080', '#000000', '#000000', '#A0A0A0', '#000000',
    ],
    speed: 15,
    scale: 10,
  },
  {
    name: 'Geode',
    gradient: [
      '#A00000','#A00000','#A00000','#A00000', '#FFA000', '#000000', '#000000', '#000000', '#000000', '#00FF80',
      '#8000A0','#8000A0','#8000A0','#8000A0', '#A000FF', '#000000', '#000000', '#000000', '#00FF80', '#000000',
    ],
    speed: 2.5,
    scale: 0.9,
  },
  {
    name: 'Stained Glass',
    gradient: [
      '#000000', '#A08000','#000000',  '#707070', '#000000', '#6000C0', '#000000', '#00A050','#000000', '#C00000', '#000000',
    ],
    speed: 1.4,
    scale: 1.9,
  },
];

export function findPresetByGradient(gradient: string[]): GradientPreset | undefined {
  return gradientPresets.find(
    (p) =>
      p.gradient.length === gradient.length &&
      p.gradient.every((color, i) => color === gradient[i]),
  );
}
