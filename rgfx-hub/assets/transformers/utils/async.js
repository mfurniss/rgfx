/**
 * Async Utilities
 */

/**
 * Sleep for a specified duration.
 *
 * @param {number} ms - Duration in milliseconds
 * @returns {Promise<void>}
 *
 * @example
 * await sleep(100);
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
