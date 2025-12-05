/**
 * Score pattern mapper
 *
 * Matches any topic containing "/score" anywhere in the path.
 * Disabled - game-specific handlers should handle score events.
 *
 * @param {import('../../../src/types/mapping-types').RgfxTopic} topic - Parsed topic with pre-split segments
 * @param {string} payload
 * @param {import('../../../src/types/mapping-types').MappingContext} context
 * @returns {boolean}
 */
export function handle() {
  // Disabled - let game-specific handlers manage score events
  return false;
}
