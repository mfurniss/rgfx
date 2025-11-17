/**
 * Ghost subject mapper
 *
 * Handles generic ghost events (primarily for Pac-Man-style games):
 * - ghost/state - Ghost state changes
 *
 * @param {import('../../../src/types/mapping-types').RgfxTopic} topic - Parsed topic with pre-split segments
 * @param {string} payload
 * @param {import('../../../src/types/mapping-types').MappingContext} context
 * @returns {boolean}
 */
export function handle({ subject, property }, _payload, { broadcast }) {

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
