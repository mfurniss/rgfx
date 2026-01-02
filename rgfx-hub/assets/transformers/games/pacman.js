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

broadcast({
  effect: 'bitmap',
  props: {
    color: 'random',
    reset: false,
    centerX: 'random',
    centerY: 'random',
    duration: 400,
    images: [[
      '    AAAAA   ',
      '  AAAAAAAAA ',
      ' AAAAAAAAAAA',
      ' AAAAAAAAAAA',
      'AAAAAAAAA   ',
      'AAAAAA      ',
      'AAA         ',
      'AAAAAA      ',
      'AAAAAAAAA   ',
      ' AAAAAAAAAAA',
      ' AAAAAAAAAAA',
      '  AAAAAAAAA ',
      '    AAAAA   ',
    ]],
  },
});

const PACMAN_SPRITE_OPEN_MOUTH = [
  '    AAAAA   ',
  '  AAAAAAAAA ',
  ' AAAAAAAAAAA',
  ' AAAAAAAAAAA',
  'AAAAAAAAA   ',
  'AAAAAA      ',
  'AAA         ',
  'AAAAAA      ',
  'AAAAAAAAA   ',
  ' AAAAAAAAAAA',
  ' AAAAAAAAAAA',
  '  AAAAAAAAA ',
  '    AAAAA   ',
];

const PACMAN_SPRITE_CLOSED_MOUTH = [
  '    AAAAA    ',
  '  AAAAAAAAA  ',
  ' AAAAAAAAAAA ',
  ' AAAAAAAAAAA ',
  'AAAAAAAAAAAAA',
  'AAAAAAAAAAAAA',
  'AAAAAAAAAAAAA',
  'AAAAAAAAAAAAA',
  'AAAAAAAAAAAAA',
  ' AAAAAAAAAAA ',
  ' AAAAAAAAAAA ',
  '  AAAAAAAAA  ',
  '    AAAAA    ',
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
        duration: 8000,
        collapse: 'none',
      },
    });
  }

  // Wakka wakka - eating regular pills
  if (subject === 'player' && property === 'eat' && qualifier === 'pill') {
    broadcast({
      effect: 'wipe',
      drivers: ['*'],
      props: {
        color: '#402020',
        duration: 300,
      },
    });
    return broadcast({
      effect: 'bitmap',
      drivers: ['rgfx-driver-0001', 'rgfx-driver-0003', 'rgfx-driver-0005'],
      props: {
        color: 'random',
        reset: false,
        centerX: 'random',
        centerY: 'random',
        duration: 400,
        images: [
          payload == 1 ? PACMAN_SPRITE_OPEN_MOUTH : PACMAN_SPRITE_CLOSED_MOUTH,
        ],
      },
    });
  }

  // Bonus fruit eaten
  if (subject === 'player' && property === 'eat' && qualifier === 'bonus') {
    return broadcast({
      effect: 'explode',
      props: {
        color: 'purple',
        reset: false,
        centerX: 50,
        centerY: 50,
        friction: 3,
        hueSpread: 40,
        lifespan: 2000,
        lifespanSpread: 60,
        particleCount: 200,
        particleSize: 4,
        power: 70,
        powerSpread: 60,
      },
    });
  }

  // Ghost eaten
  if (subject === 'player' && property === 'eat' && qualifier === 'ghost') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#00A0FF',
        duration: 2000,
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
        duration: part === 1 ? 1700 : 300,
      },
    });
  }

  // Ghost eyes (after being eaten, returning to home)
  if (subject === 'player' && property === 'ghost' && qualifier === 'eyes') {
    (async () => {
      for (var i = 0; i < 8; i++) {
        broadcast({
          effect: 'wipe',
          props: {
            color: '#FFFFFF',
            duration: 500,
          },
        });
        await sleep(500);
      }
    })();

    return true;
  }

  // Game mode changes (1=demo, 2=select game, 3=playing)
  if (subject === 'game' && property === 'mode') {
    const mode = parseInt(payload);
    const colors = {
      1: '#888888', // Demo
      2: '#00FF00', // Game select
      3: '#FFFF00', // Playing
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
          color: 'blue',
          reset: true,
          centerX: 50,
          centerY: 50,
          friction: 3,
          hueSpread: 0,
          lifespan: 2000,
          lifespanSpread: 60,
          particleCount: 300,
          particleSize: 4,
          power: 70,
          powerSpread: 0,
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
      drivers: ['*'],
      props: {
        color,
        duration: 1500,
        fade: true,
      },
    });
  }
}
