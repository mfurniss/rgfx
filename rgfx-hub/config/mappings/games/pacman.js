/**
 * Pac-Man game-specific mapper
 *
 * Handles Pac-Man/Ms. Pac-Man specific events:
 * - pacman/player/score/p1 - Player score (brown wipe effect)
 * - pacman/player/pill/state - Power pill state (blue when active, red when inactive)
 * - pacman/player/insert-coin - Coin inserted (yellow pulse)
 * - pacman/player/eat/power-pill - Power pill eaten (blue explosion)
 * - pacman/player/eat/pill - Regular pill eaten, wakka sound (quick yellow pulse)
 * - pacman/player/eat/bonus - Bonus fruit eaten (magenta pulse)
 * - pacman/player/eat/ghost - Ghost eaten (cyan pulse)
 * - pacman/player/die - Player death animation (red pulse, part 1 or 2)
 * - pacman/player/ghost/eyes - Ghost eyes returning home (white pulse)
 * - pacman/player/dots-remaining - Dots remaining (explosion when level complete)
 * - pacman/game/mode - Game mode changes (demo/select/playing with different colors)
 * - pacman/ghost/{color}/state - Individual ghost states with color-coded effects
 *
 * Selective Driver Routing:
 * You can optionally target specific drivers by adding a "drivers" array to the broadcast payload:
 *   broadcast({
 *     effect: "pulse",
 *     props: { color: "#FF0000" },
 *     drivers: ["rgfx-driver-0001", "rgfx-driver-0002"]  // Driver IDs
 *   })
 *
 * If no "drivers" array is provided, the effect broadcasts to all connected drivers.
 *
 * @param {import('../../../src/types/mapping-types').RgfxTopic} topic - Parsed topic with pre-split segments
 * @param {string} payload - Event payload (e.g., "100")
 * @param {import('../../../src/types/mapping-types').MappingContext} context - Mapping context with services
 * @returns {boolean} - True if event was handled, false otherwise
 */

const PACMAN_SPRITE_OPEN_MOUTH = [
  '     XXXXXX     ',
  '   XXXXXXXXXX   ',
  '  XXXXXXXXXXXX  ',
  ' XXXXXXXXXXX    ',
  ' XXXXXXXXXX     ',
  'XXXXXXXXX       ',
  'XXXXXXXX        ',
  'XXXXXXX         ',
  'XXXXXXX         ',
  'XXXXXXXX        ',
  'XXXXXXXXX       ',
  ' XXXXXXXXXX     ',
  ' XXXXXXXXXXX    ',
  '  XXXXXXXXXXXX  ',
  '   XXXXXXXXXX   ',
  '     XXXXXX     ',
];

const PACMAN_SPRITE_CLOSED_MOUTH = [
  '     XXXXXX     ',
  '   XXXXXXXXXX   ',
  '  XXXXXXXXXXXX  ',
  ' XXXXXXXXXXXXXX ',
  ' XXXXXXXXXXXXXX ',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  'XXXXXXXXXXXXXXXX',
  ' XXXXXXXXXXXXXX ',
  ' XXXXXXXXXXXXXX ',
  '  XXXXXXXXXXXX  ',
  '   XXXXXXXXXX   ',
  '     XXXXXX     ',
];

const GHOST_STATE = {
  NORMAL: [0x01, 0x03, 0x05, 0x07], // Red, pink, cyan, orange (normal)
  VULNERABLE: 0x11, // Blue (power pill active)
  FLASHING: 0x12, // White (power pill wearing off)
  EATEN: 0x18, // Score display (200/400/800/1600)
  EYES: 0x19, // Eyes returning to ghost home
  CUTSCENE: 0x1d, // Cutscene color (intermissions)
};

const GHOST_COLORS = {
  red: '#FF0000',
  pink: '#FFB8FF',
  cyan: '#00FFFF',
  orange: '#FFB852',
};

// Lookup table for ghost state colors
const GHOST_STATE_COLORS = {
  [GHOST_STATE.VULNERABLE]: '#0000FF',
  [GHOST_STATE.FLASHING]: '#FFFFFF',
  [GHOST_STATE.EATEN]: '#00FFFF',
  [GHOST_STATE.EYES]: '#FFFFFF',
};

export function handle(
  { subject, property, qualifier },
  payload,
  { broadcast }
) {
  // Score changes - disabled for now to test bitmap effect
  // if (subject === 'player' && property === 'score') {
  //   broadcast({
  //     effect: 'wipe',
  //     props: {
  //       color: '#705014',
  //       duration: 500,
  //     },
  //     drivers: ['rgfx-driver-0001', 'rgfx-driver-0003'],
  //   });
  //   return broadcast({
  //     effect: 'explode',
  //     drivers: ['rgfx-driver-0002', 'rgfx-driver-0004'],
  //   });
  // }

  // Power pill state - blue when active, red when inactive
  if (subject === 'player' && property === 'pill') {
    const state = parseInt(payload);
    const isActive = state > 0;

    return broadcast({
      effect: 'pulse',
      props: {
        color: isActive ? '#0000FF' : '#FF0000',
      },
      drivers: ['rgfx-driver-0002'], // LED Matrix
    });
  }

  // Coin inserted
  if (subject === 'player' && property === 'insert-coin') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FFFF00',
        duration: 300,
      },
    });
  }

  // Power pill eaten
  if (
    subject === 'player' &&
    property === 'eat' &&
    qualifier === 'power-pill'
  ) {
    broadcast({
      effect: 'pulse',
      props: {
        color: '#0000FF',
        duration: 5000,
      },
    });

    broadcast({
      effect: 'explode',
      props: {
        color: '#FFFF80',
        particleCount: 200,
        power: 100,
        lifespan: 800,
        powerSpread: 1.6,
        particleSize: 3,
        friction: 2.2,
        lifespanSpread: 1.3,
        centerX: 0,
        centerY: 0,
      },
    });

    return broadcast({
      effect: 'explode',
      props: {
        color: '#FFFF80',
        particleCount: 200,
        power: 100,
        lifespan: 800,
        powerSpread: 1.6,
        particleSize: 3,
        friction: 2.2,
        lifespanSpread: 1.3,
        centerX: 100,
        centerY: 100,
      },
    });
  }

  // Wakka wakka - eating regular pills
  if (subject === 'player' && property === 'eat' && qualifier === 'pill') {
    broadcast({
      effect: 'wipe',
      drivers: ['*', '*'],
      props: {
        color: '#603030',
        duration: 700,
      },
    });
    return broadcast({
      effect: 'bitmap',
      drivers: ['rgfx-driver-0003', 'rgfx-driver-0005'],
      props: {
        color: 'yellow',
        duration: 150,
        image:
          payload == 1 ? PACMAN_SPRITE_OPEN_MOUTH : PACMAN_SPRITE_CLOSED_MOUTH,
      },
    });
  }

  // Bonus fruit eaten
  if (subject === 'player' && property === 'eat' && qualifier === 'bonus') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FF00FF',
        duration: 1200,
      },
    });
  }

  // Ghost eaten
  if (subject === 'player' && property === 'eat' && qualifier === 'ghost') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#00A0FF',
        duration: 1000,
      },
    });
  }

  // Player death (part 1 or 2)
  if (subject === 'player' && property === 'die') {
    const part = parseInt(payload);
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FFFF00',
        duration: part === 1 ? 2500 : 300,
      },
    });
  }

  // Ghost eyes (after being eaten, returning to home)
  if (subject === 'player' && property === 'ghost' && qualifier === 'eyes') {
    broadcast({
      effect: 'wipe',
      props: {
        color: '#FFFFFF',
        duration: 1200,
      },
    });
    return broadcast({
      effect: 'wipe',
      props: {
        color: '#FFFFFF',
        duration: 800,
      },
    });
  }

  // Game mode changes (1=demo, 2=select game, 3=playing)
  if (subject === 'game' && property === 'mode') {
    const mode = parseInt(payload);
    const colors = {
      1: '#888888', // Demo - gray
      2: '#00FF00', // Game select - green
      3: '#FFFF00', // Playing - yellow
    };

    return broadcast({
      effect: 'pulse',
      props: {
        color: colors[mode] || '#FFFFFF',
        duration: 500,
      },
    });
  }

  // Dots remaining counter
  if (subject === 'player' && property === 'dots-remaining') {
    const remaining = parseInt(payload);

    if (remaining === 0) {
      return broadcast({
        effect: 'explode',
        props: {
          color: '#FFFF00',
          duration: 2000,
        },
      });
    }
  }

  // Ghost state changes - color-coded effects
  // Topic format: pacman/ghost/{color}/state
  if (subject === 'ghost' && qualifier) {
    const ghostColor = property;
    const state = parseInt(payload);

    // Look up color by state, or use ghost's normal color
    const color =
      GHOST_STATE_COLORS[state] || GHOST_COLORS[ghostColor] || '#FFFFFF';

    return broadcast({
      effect: 'pulse',
      drivers: ['*'], // LED Matrix
      props: {
        color,
        duration: 1500,
        fade: true,
      },
    });
  }
}
