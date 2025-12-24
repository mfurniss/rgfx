/**
 * Galaga 88 game-specific mapper
 *
 * Handles Galaga 88 specific events:
 * - galaga88/player/score/p1 - Player score
 * - galaga88/player/fire - Player shooting
 * - galaga88/enemy/destroy - Enemy destroyed
 * - galaga88/sound/music_start - Music started
 * - galaga88/sound/effect - Sound effect (payload = effect number 1-3)
 */

const EFFECT_COLORS = {
  1: '#FF8800', // Orange
  2: '#00FF88', // Green
  3: '#8800FF', // Purple
};

export function handle({ subject, property }, payload, { broadcast }) {
  // Player shooting - cyan projectile effect
  if (subject === 'player' && property === 'fire') {
    return broadcast({
      effect: 'wipe',
      props: {
        color: '#00FFFF',
        duration: 200,
        direction: 'up',
      },
    });
  }

  // Enemy destroyed - particle explosion
  if (subject === 'enemy' && property === 'destroy') {
    return broadcast({
      effect: 'explode',
      drivers: ['*', '*'],
      props: {
        particleCount: 80,
        power: 120,
        lifespan: 380,
        powerSpread: 40,
        particleSize: 4,
        hueSpread: 40,
        friction: 3,
        lifespanSpread: 40,
      },
    });
  }

  // Music start - rainbow pulse
  if (subject === 'sound' && property === 'music_start') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: 'rainbow',
        duration: 1000,
      },
    });
  }

  // Sound effects - color based on effect number in payload
  if (subject === 'sound' && property === 'effect') {
    const effectNum = parseInt(payload);
    const color = EFFECT_COLORS[effectNum] || '#FFFFFF';
    return broadcast({
      effect: 'pulse',
      props: {
        color,
        duration: 150,
      },
    });
  }
}
