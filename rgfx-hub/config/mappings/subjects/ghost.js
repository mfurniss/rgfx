/**
 * Ghost subject mapper
 *
 * Handles generic ghost events (primarily for Pac-Man-style games):
 * - ghost/state - Ghost state changes
 *
 * @param {string} topic
 * @param {string} payload
 * @param {import('../../../src/types/mapping-types').MappingContext} context
 * @returns {boolean}
 */
export function handle(topic, _payload, { broadcast }) {
  const [, subject, property] = topic.split('/');

  if (subject !== 'ghost') return false;

  // Generic ghost state change
  if (property === 'state') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FFFFFF',
      },
    });
  }
}
