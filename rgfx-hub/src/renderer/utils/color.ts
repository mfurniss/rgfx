/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { HEX_COLOR_RRGGBB_REGEX } from '@/config/constants';

export const colorSwatchMap: Record<string, string> = {
  random: '#808080',
  red: '#ff0000',
  green: '#00ff00',
  blue: '#0000ff',
  white: '#ffffff',
  black: '#000000',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  lime: '#00ff00',
  aqua: '#00ffff',
  navy: '#000080',
  teal: '#008080',
  olive: '#808000',
  maroon: '#800000',
  silver: '#c0c0c0',
  gray: '#808080',
  grey: '#808080',
};

export function isValidHex(value: string): boolean {
  return HEX_COLOR_RRGGBB_REGEX.test(value);
}

export function isValidColor(value: string): boolean {
  if (isValidHex(value)) {
    return true;
  }

  if (value in colorSwatchMap) {
    return true;
  }

  return false;
}

export function normalizeHex(value: string): string {
  // Already valid 6-char hex
  if (HEX_COLOR_RRGGBB_REGEX.test(value)) {
    return value;
  }

  // Add # prefix if missing (ff0000 → #ff0000)
  if (/^[0-9a-fA-F]{6}$/.test(value)) {
    return '#' + value;
  }

  // Expand 3-char shorthand (#f00 → #ff0000)
  const match = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(value);

  if (match) {
    return `#${match[1]}${match[1]}${match[2]}${match[2]}${match[3]}${match[3]}`;
  }

  // Expand 3-char without # (f00 → #ff0000)
  const matchNoHash = /^([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(value);

  if (matchNoHash) {
    return `#${matchNoHash[1]}${matchNoHash[1]}${matchNoHash[2]}${matchNoHash[2]}${matchNoHash[3]}${matchNoHash[3]}`;
  }

  return value;
}

export function valueToHex(value: unknown): string {
  if (typeof value === 'number') {
    return '#' + value.toString(16).padStart(6, '0');
  }

  if (typeof value === 'string') {
    if (colorSwatchMap[value]) {
      return colorSwatchMap[value];
    }

    if (HEX_COLOR_RRGGBB_REGEX.test(value)) {
      return value;
    }

    if (/^[0-9a-fA-F]{6}$/.test(value)) {
      return '#' + value;
    }
  }

  return '#808080';
}
