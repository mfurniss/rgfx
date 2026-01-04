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
  {
    name: 'Demoszene',
    gradient: ['#600060', '#0000FF', '#00FFFF', '#FFFFFF', '#FFFF00', '#FF0000', '#600060'],
    speed: 2.9,
    scale: 0.8,
  },
  {
    name: 'Call me Vic',
    gradient: [
      '#000000', '#000000',
      '#FFFFFF', '#FFFFFF',
      '#880000', '#880000',
      '#AAFFEE', '#AAFFEE',
      '#CC44CC', '#CC44CC',
      '#00CC55', '#00CC55',
      '#0000AA', '#0000AA',
      '#EEEE77', '#EEEE77',
      '#DD8855', '#DD8855',
      '#664400', '#664400',
      '#FF7777', '#FF7777',
      '#333333', '#333333',
      '#777777', '#777777',
      '#AAFF66', '#AAFF66',
      '#0088FF', '#0088FF',
      '#BBBBBB', '#BBBBBB',
    ],
    speed: 2,
    scale: 0.35,
  },
  {
    name: 'Speculation',
    gradient: [
      '#000000', '#000000',
      '#0000E0', '#0000E0',
      '#E00000', '#E00000',
      '#E000E0', '#E000E0',
      '#00E000', '#00E000',
      '#00E0E0', '#00E0E0',
      '#E0E000', '#E0E000',
      '#E0E0E0', '#E0E0E0',
      '#000000', '#000000',
      '#000070', '#000070',
      '#700000', '#700000',
      '#700070', '#700070',
      '#007000', '#007000',
      '#007070', '#007070',
      '#707000', '#707000',
      '#707070', '#707070',
    ],
    speed: 2,
    scale: 0.35,
  },
  {
    name: 'Hive Mind',
    gradient: [
      '#18617b',
      '#090a05',
      '#d96330',
      '#6d396f',
      '#211e25',
      '#161313',
      '#308aa1',
      '#18617b',
    ],
    speed: 3.25,
    scale: 7.83,
  },
];

export function findPresetByGradient(gradient: string[]): GradientPreset | undefined {
  return gradientPresets.find(
    (p) =>
      p.gradient.length === gradient.length &&
      p.gradient.every((color, i) => color === gradient[i]),
  );
}
