export { sleep, trackedTimeout, trackedInterval, debounce, throttleLatest, clearAllTimers } from './async.js';
export { scaleLinear, randomInt, randomElement, hslToRgb } from './math.js';
export { getWorldRecord } from './world-record.js';

/**
 * Format a number with locale-appropriate thousands separators.
 *
 * @param {number|string} value - Number to format
 * @returns {string} Formatted number (e.g., "12,340")
 *
 * @example
 * formatNumber(12340);   // returns "12,340"
 * formatNumber("99850"); // returns "99,850"
 */
export function formatNumber(value) {
  return Number(value).toLocaleString();
}
