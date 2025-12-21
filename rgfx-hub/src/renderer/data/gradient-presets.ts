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
    name: 'The Deep Blue',
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
    name: 'Clouds',
    gradient: ['#408080', '#408080', '#B0B0B0', '#408080', '#408080'],
    speed: 0.8,
    scale: 1,
  },
  {
    name: 'Limeurple',
    gradient: ['#700070', '#B0FF00', '#300050', '#700070'],
    speed: 6,
    scale: 5,
  },
  {
    name: 'Hot Fuzz',
    gradient: ['#FF0000', '#000000', '#000000', '#0000FF'],
    speed: 17,
    scale: 0.5,
  },
  {
    name: 'Lava',
    gradient: ['#400000', '#400000', '#FF4500', '#FFD700', '#400000'],
    speed: 3,
    scale: 4,
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
];

export function findPresetByGradient(gradient: string[]): GradientPreset | undefined {
  return gradientPresets.find(
    (p) =>
      p.gradient.length === gradient.length &&
      p.gradient.every((color, i) => color === gradient[i]),
  );
}
