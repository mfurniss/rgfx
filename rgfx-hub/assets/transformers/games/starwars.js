/**
 * Star Wars (Atari 1983) Transformer
 * Converts game events to LED effects
 */

// Star Wars color palette
const COLORS = {
  LASER_GREEN: '#00FF00', // X-wing lasers
  FIREBALL_RED: '#FF3300', // Enemy fireballs
  EXPLOSION_WHITE: '#FFFFFF', // Death Star explosion
  TIE_GRAY: '#808080', // TIE fighters
  VADER_PURPLE: '#8B00FF', // Darth Vader's TIE
  TOWER_YELLOW: '#FFD700', // Tower destruction
  TURRET_ORANGE: '#FF6600', // Turret destruction
  SHIELD_BLUE: '#0066FF', // Shield indicators
  FORCE_CYAN: '#00FFFF', // "Use the Force" moments
  DEATH_RED: '#FF0000', // Player death
  SCORE_GOLD: '#C0A000', // Score updates
};

export function handle({ subject, property, qualifier }, payload, { broadcast }) {
  // Score change - display score on matrix
  if (subject === 'player' && property === 'score') {
    return broadcast({
      effect: 'text',
      props: {
        text: payload,
        color: COLORS.SCORE_GOLD,
        duration: 2000,
      },
      drivers: ['rgfx-driver-0005'], // Target matrix driver
    });
  }
}
