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
    // Grunt
    name: 'Grunt',
    image: [
      '...888...',
      '..BBBBB..',
      '..DDDDD..',
      '...BBB...',
      'BB7BBB7BB',
      'A8877788A',
      'A.88788.A',
      'A..888..A',
      '...888...',
      '..88.88..',
      '..88.88..',
      '.AAA.AAA.',
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
