/**
 * Super Mario Bros game-specific mapper
 *
 * Handles Super Mario Bros specific events:
 * - smb/player/score - Player score (red pulse for Mario theme)
 * - smb/player/coins - Coin collection (yellow flash)
 * - smb/player/powerup - Power-up state (mushroom, fire flower, star)
 * - smb/player/death - Player death (red fade)
 * - smb/enemy/defeated - Enemy defeated (white sparkle)
 *
 * Note: This is a placeholder mapper. Actual memory addresses need to be
 * determined by analyzing the NES ROM and creating an interceptor.
 *
 * @param {string} topic
 * @param {string} payload
 * @param {import('../../../src/types/mapping-types').MappingContext} context
 * @returns {boolean}
 */
export function handle(topic, payload, { broadcast }) {
  const [, subject, property] = topic.split('/');

  // Player score - red pulse (Mario's signature color)
  if (subject === 'player' && property === 'score') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FF0000', // Mario red
      },
    });
  }

  // Coin collection - yellow pulse
  if (subject === 'player' && property === 'coins') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FFD700', // Gold
      },
    });
  }

  // Power-up state change
  if (subject === 'player' && property === 'powerup') {
    const powerup = payload; // 'small', 'super', 'fire', 'star'
    let color = '#FFFFFF';

    switch (powerup) {
      case 'mushroom':
      case 'super':
        color = '#FF0000'; // Red mushroom
        break;
      case 'fire':
        color = '#FFA500'; // Orange fire flower
        break;
      case 'star':
        color = '#FFFF00'; // Yellow star
        break;
    }

    return broadcast({
      effect: 'pulse',
      props: {
        color,
      },
    });
  }

  // Player death - red pulse
  if (subject === 'player' && property === 'death') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FF0000',
      },
    });
  }

  // Enemy defeated - white pulse
  if (subject === 'enemy' && property === 'defeated') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FFFFFF',
      },
    });
  }
}
