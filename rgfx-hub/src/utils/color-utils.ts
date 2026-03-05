import type { AmbilightGradient } from '../types/transformer-types';

/**
 * Parse ambilight payload (12-bit colors) to background effect gradient props.
 * Converts compact 12-bit hex colors (e.g., "F00,0F0,00F") to full 24-bit.
 */
export function parseAmbilight(
  payload: string,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
): AmbilightGradient {
  const colors = payload.split(',').map((c) => {
    // Expand 12-bit to 24-bit: F0A -> #FF00AA
    const r = c[0] || '0';
    const g = c[1] || '0';
    const b = c[2] || '0';
    return `#${r}${r}${g}${g}${b}${b}`;
  });

  return { colors, orientation };
}

/**
 * Convert HSL color to hex string.
 *
 * @param h Hue (0-360)
 * @param s Saturation (0-100)
 * @param l Lightness (0-100)
 * @returns Hex color string (e.g., "#FF77A8")
 */
export function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const lit = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * lit - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lit - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0')
      .toUpperCase();

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
