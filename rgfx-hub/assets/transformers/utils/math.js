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
