/**
 * Enemy subject mapper
 *
 * Handles generic enemy events across all games:
 * - enemy/destroyed - Enemy killed/destroyed
 * - enemy/spawned - Enemy spawned
 *
 * @param {string} topic
 * @param {string} payload
 * @param {import('../../../src/types/mapping-types').MappingContext} context
 * @returns {boolean}
 */
export function handle(topic, _payload, { broadcast }) {
  const [, subject, property] = topic.split('/');

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
