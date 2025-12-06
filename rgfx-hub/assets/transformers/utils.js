/**
 * Transformer Utilities
 *
 * Helper functions available to all transformers.
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
