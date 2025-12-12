/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

interface SpritePreset {
  name: string;
  image: string[];
}

export const spritePresets: SpritePreset[] = [
  {
    name: 'Pac-Man',
    image: [
      '    XXXXX   ',
      '  XXXXXXXXX ',
      ' XXXXXXXXXXX',
      ' XXXXXXXXXXX',
      'XXXXXXXXX   ',
      'XXXXXX      ',
      'XXX         ',
      'XXXXXX      ',
      'XXXXXXXXX   ',
      ' XXXXXXXXXXX',
      ' XXXXXXXXXXX',
      '  XXXXXXXXX ',
      '    XXXXX   ',
    ],
  },
  {
    name: 'Ghost',
    image: [
      '     XXXX     ',
      '   XXXXXXXX   ',
      '  XXXXXXXXXX  ',
      ' XXXXXXXXXXXX ',
      ' XX   XX   XX ',
      'XXX   XX   XXX',
      'XXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXX',
      'XX  XX  XX  XX',
      'X XX  XX  XX X',
      'XXXXXXXXXXXXXX',
      'XXXXXXXXXXXXXX',
      'XXXX XXXX XXXX',
      ' XX   XX   XX ',
    ],
  },
  {
    name: 'Galaga Ship',
    image: [
      '   XX   ',
      '   XX   ',
      '   XX   ',
      'X XXXX X',
      'X XXXX X',
      'XXXXXXXX',
      'X XXXX X',
      'X  XX  X',
    ],
  },
];

export function findPresetByImage(image: string[]): SpritePreset | undefined {
  return spritePresets.find(
    (p) => p.image.length === image.length && p.image.every((row, i) => row === image[i]),
  );
}
