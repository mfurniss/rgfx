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
    // Bubble Bobble dragon (Bub) - 16x16 arcade sprite
    // Converted from actual game sprite via GIMP export
    // B=Green, A=Yellow, 7=White, 0=Black, E=Pink
    name: 'Bub (Bubble Bobble)',
    image: [
      '.......A........',
      '......AAA.......',
      '....BBBBBAAAA...',
      '...BBBBBBBAA....',
      '..B7B77BBBB.....',
      '..70B077BBBAAA..',
      '..70B077BBBBA...',
      '.B70B077AABB....',
      '.A70B077AAABAA..',
      '.BB7B77BA0BBA...',
      '..0070000BEB....',
      '..BBBBBBBEEEB...',
      '...7777BEEEEB...',
      '..777777BEEBBA..',
      'EEE777EEBBBBBBA.',
      '.EE77EEEEEBBBBBB',
    ],
  },
  {
    // 4x4 grid of all 16 PICO-8 palette colors (0-F)
    // Each "block" is 4x4 pixels for visibility
    name: 'Palette Test (16 colors)',
    image: [
      '0000111122223333',
      '0000111122223333',
      '0000111122223333',
      '0000111122223333',
      '4444555566667777',
      '4444555566667777',
      '4444555566667777',
      '4444555566667777',
      '88889999AAAABBBB',
      '88889999AAAABBBB',
      '88889999AAAABBBB',
      '88889999AAAABBBB',
      'CCCCDDDDEEEEFFFF',
      'CCCCDDDDEEEEFFFF',
      'CCCCDDDDEEEEFFFF',
      'CCCCDDDDEEEEFFFF',
    ],
  },
  {
    // Pac-Man using palette index A (Yellow)
    name: 'Pac-Man',
    image: [
      '    AAAAA   ',
      '  AAAAAAAAA ',
      ' AAAAAAAAAAA',
      ' AAAAAAAAAAA',
      'AAAAAAAAA   ',
      'AAAAAA      ',
      'AAA         ',
      'AAAAAA      ',
      'AAAAAAAAA   ',
      ' AAAAAAAAAAA',
      ' AAAAAAAAAAA',
      '  AAAAAAAAA ',
      '    AAAAA   ',
    ],
  },
  {
    // Ghost using palette index 8 (Red)
    name: 'Ghost',
    image: [
      '     8888     ',
      '   88888888   ',
      '  8888888888  ',
      ' 888888888888 ',
      ' 88   88   88 ',
      '888   88   888',
      '88888888888888',
      '88888888888888',
      '88  88  88  88',
      '8 88  88  88 8',
      '88888888888888',
      '88888888888888',
      '8888 8888 8888',
      ' 88   88   88 ',
    ],
  },
];

export function findPresetByImage(image: string[]): SpritePreset | undefined {
  return spritePresets.find(
    (p) => p.image.length === image.length && p.image.every((row, i) => row === image[i]),
  );
}
