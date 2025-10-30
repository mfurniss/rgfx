/**
 * Score pattern mapper
 *
 * Matches any topic containing "/score" anywhere in the path.
 * Provides a generic green pulse.
 *
 * @param {string} topic
 * @param {string} payload
 * @param {import('../../../src/types/mapping-types').MappingContext} context
 * @returns {boolean}
 */
export function handle(topic, _payload, { broadcast }) {
  // Match any topic with "score" anywhere
  if (!topic.includes('/score')) return false;

  return broadcast({
    effect: 'pulse',
    props: {
      color: '#00FF00',
    },
  });
}
