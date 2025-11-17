/**
 * Score pattern mapper
 *
 * Matches any topic containing "/score" anywhere in the path.
 * Provides a generic green pulse.
 *
 * @param {import('../../../src/types/mapping-types').RgfxTopic} topic - Parsed topic with pre-split segments
 * @param {string} payload
 * @param {import('../../../src/types/mapping-types').MappingContext} context
 * @returns {boolean}
 */
export function handle({ raw }, _payload, { broadcast }) {
  // Match any topic with "score" anywhere
  if (!raw.includes('/score')) return false;

  return broadcast({
    effect: 'pulse',
    props: {
      color: '#00FF00',
    },
  });
}
