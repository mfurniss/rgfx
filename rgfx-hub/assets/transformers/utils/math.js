/**
 * Math Utilities
 */

/**
 * Create a linear scale function that maps input domain to output range.
 *
 * @param {number} domainMin - Minimum input value
 * @param {number} domainMax - Maximum input value
 * @param {number} rangeMin - Minimum output value
 * @param {number} rangeMax - Maximum output value
 * @returns {function(number): number} Scale function
 *
 * @example
 * const scale = scaleLinear(0, 100, 0, 255);
 * scale(50); // returns 127.5
 */
export function scaleLinear(domainMin, domainMax, rangeMin, rangeMax) {
  return (value) => {
    const ratio = (value - domainMin) / (domainMax - domainMin);
    return rangeMin + ratio * (rangeMax - rangeMin);
  };
}

/**
 * Return a random integer between a and b (inclusive).
 * If only one argument is passed, returns 0 to a.
 *
 * @param {number} a - Minimum value (or max if only arg)
 * @param {number} [b] - Maximum value
 * @returns {number}
 *
 * @example
 * randomInt(10);    // returns 0-10
 * randomInt(1, 10); // returns 1-10
 */
export function randomInt(a, b) {
  if (b === undefined) {
    return Math.floor(Math.random() * (a + 1));
  }
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

/**
 * Pick a random element from an array.
 *
 * @template T
 * @param {T[]} array
 * @returns {T}
 *
 * @example
 * randomElement(['a', 'b', 'c']); // returns 'a', 'b', or 'c'
 */
export function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Convert HSL color values to an RGB hex string.
 *
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-1)
 * @param {number} l - Lightness (0-1)
 * @returns {string} Hex color string, e.g. "#FF0000"
 *
 * @example
 * hslToRgb(0, 1, 0.5);   // "#FF0000" (red)
 * hslToRgb(120, 1, 0.5);  // "#00FF00" (green)
 * hslToRgb(240, 1, 0.5);  // "#0000FF" (blue)
 */
export function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r, g, b;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}
