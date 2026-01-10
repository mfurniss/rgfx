/**
 * Enemy subject mapper
 *
 * Handles generic enemy events across all games:
 * - enemy/destroyed - Enemy killed/destroyed
 * - enemy/spawned - Enemy spawned
 *
 * @param {import('../../../src/types/mapping-types').RgfxTopic} topic - Parsed topic with pre-split segments
 * @param {string} payload
 * @param {import('../../../src/types/mapping-types').MappingContext} context
 * @returns {boolean}
 */
export function transform({ subject, property, payload: _payload }, { broadcast }) {
  return false;
  if (subject !== 'enemy') return false;

  // Enemy destroyed/killed
  if (property === 'destroyed' || property === 'killed') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FFFFFF',
      },
    });
  }

  // Enemy spawned
  if (property === 'spawned') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FF8800',
      },
    });
  }
}
