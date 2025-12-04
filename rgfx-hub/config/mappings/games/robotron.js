/**
 * Robotron: 2084 game-specific mapper
 *
 * Handles Robotron-specific events:
 * - robotron/player/score/p1 - Player score
 * - robotron/player/lives - Lives remaining
 * - robotron/player/die - Player death
 * - robotron/player/fire - Laser fired (with direction: up, down, left, right, up-left, etc.)
 * - robotron/wave/number - Current wave number
 * - robotron/wave/complete - Wave completed
 * - robotron/enemy/grunt/destroy - Grunt killed (100 pts)
 * - robotron/enemy/brain/destroy - Brain killed (500 pts)
 * - robotron/enemy/spheroid/destroy - Spheroid killed (1000 pts, spawns Enforcers)
 * - robotron/enemy/quark/destroy - Quark killed (1000 pts, spawns Tanks)
 * - robotron/enemy/tank/destroy - Tank killed (200 pts)
 * - robotron/enemy/enforcer/destroy - Enforcer killed (150 pts)
 * - robotron/enemy/enforcer/spawn - Enforcer spawned
 * - robotron/enemy/spark/count - Spark missiles on screen
 * - robotron/enemy/cruise/count - Cruise missiles on screen
 * - robotron/enemy/electrode/count - Electrodes on screen
 * - robotron/family/rescue - Family member rescued (mommie/daddie/mikey)
 *
 * @param {import('../../../src/types/mapping-types').RgfxTopic} topic - Parsed topic
 * @param {string} payload - Event payload
 * @param {import('../../../src/types/mapping-types').MappingContext} context - Mapping context
 * @returns {boolean} - True if event was handled
 */

// Robotron player sprite (simplified humanoid)
const PLAYER_SPRITE = [
  '    XX    ',
  '   XXXX   ',
  '    XX    ',
  '  XXXXXX  ',
  ' XXXXXXXX ',
  '    XX    ',
  '   X  X   ',
  '  X    X  ',
];

// Explosion/death sprite
const EXPLOSION_SPRITE = [
  '  X    X  ',
  ' X  XX  X ',
  '   XXXX   ',
  ' XXXXXXXX ',
  ' XXXXXXXX ',
  '   XXXX   ',
  ' X  XX  X ',
  '  X    X  ',
];

// Family member sprite (for rescue effects)
const FAMILY_SPRITE = [
  '   XX   ',
  '  XXXX  ',
  '   XX   ',
  '  XXXX  ',
  '   XX   ',
  '  X  X  ',
];

// Direction to wipe mapping for fire events
const FIRE_DIRECTION_MAP = {
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
  'up-left': 'left',
  'up-right': 'right',
  'down-left': 'left',
  'down-right': 'right',
};

// Track score for milestone detection
let lastScore = 0;

export function handle({ subject, property, qualifier }, payload, { broadcast }) {
  // Player fire - directional green wipe
  if (subject === 'player' && property === 'fire') {
    const wipeDirection = FIRE_DIRECTION_MAP[payload] || 'right';
    return broadcast({
      effect: 'wipe',
      props: {
        color: '#00FF00',
        duration: 150,
        direction: wipeDirection,
      },
    });
  }

  // Player death - red pulse with explosion bitmap
  if (subject === 'player' && property === 'die') {
    broadcast({
      effect: 'bitmap',
      drivers: ['rgfx-driver-0001', 'rgfx-driver-0003'],
      props: {
        color: '#FF0000',
        centerX: 50,
        centerY: 50,
        duration: 800,
        reset: true,
        image: EXPLOSION_SPRITE,
      },
    });
    return broadcast({
      effect: 'pulse',
      drivers: ['rgfx-driver-0002', 'rgfx-driver-0004'],
      props: {
        color: '#FF0000',
        duration: 800,
      },
    });
  }

  // Wave complete - celebratory explosion
  if (subject === 'wave' && property === 'complete') {
    return broadcast({
      effect: 'explode',
      props: {
        color: 'random',
        reset: true,
        centerX: 50,
        centerY: 50,
        friction: 2,
        hueSpread: 120,
        lifespan: 1500,
        lifespanSpread: 1.8,
        particleCount: 200,
        particleSize: 4,
        power: 150,
        powerSpread: 1.6,
      },
    });
  }

  // Wave milestone (every 5 waves gets special effect)
  if (subject === 'wave' && property === 'number') {
    const wave = parseInt(payload);
    if (wave > 0 && wave % 5 === 0) {
      return broadcast({
        effect: 'pulse',
        props: {
          color: '#FFFF00',
          duration: 500,
        },
      });
    }
  }

  // Score updates - check for milestones (every 25,000 points)
  if (subject === 'player' && property === 'score') {
    const score = parseInt(payload);
    const milestone = 25000;
    const lastMilestone = Math.floor(lastScore / milestone);
    const currentMilestone = Math.floor(score / milestone);

    lastScore = score;

    if (currentMilestone > lastMilestone) {
      // Score milestone reached
      return broadcast({
        effect: 'explode',
        props: {
          color: '#FFFF00',
          reset: false,
          centerX: 50,
          centerY: 50,
          friction: 3,
          hueSpread: 60,
          lifespan: 1000,
          lifespanSpread: 1.4,
          particleCount: 100,
          particleSize: 3,
          power: 80,
          powerSpread: 1.5,
        },
      });
    }
  }

  // Lives change (bonus life earned when lives increase)
  if (subject === 'player' && property === 'lives') {
    // Could track previous lives to detect bonus life
    // For now, just acknowledge the event
    return false;
  }

  // Enforcer spawn - magenta warning pulse
  if (subject === 'enemy' && property === 'enforcer' && qualifier === 'spawn') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FF00FF',
        duration: 300,
      },
    });
  }

  // Enforcer destroy - cyan flash
  if (subject === 'enemy' && property === 'enforcer' && qualifier === 'destroy') {
    return broadcast({
      effect: 'explode',
      props: {
        color: '#00FFFF',
        reset: true,
        centerX: 'random',
        centerY: 'random',
        friction: 4,
        hueSpread: 30,
        lifespan: 400,
        lifespanSpread: 1.2,
        particleCount: 50,
        particleSize: 3,
        power: 60,
        powerSpread: 1.3,
      },
    });
  }

  // Grunt destroy - quick cyan pulse (most common enemy)
  if (subject === 'enemy' && property === 'grunt' && qualifier === 'destroy') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#00FFFF',
        duration: 100,
        fade: true,
      },
    });
  }

  // Brain destroy - purple explosion (high value, dangerous)
  if (subject === 'enemy' && property === 'brain' && qualifier === 'destroy') {
    return broadcast({
      effect: 'explode',
      props: {
        color: '#AA00FF',
        reset: true,
        centerX: 'random',
        centerY: 'random',
        friction: 3,
        hueSpread: 40,
        lifespan: 600,
        lifespanSpread: 1.4,
        particleCount: 80,
        particleSize: 4,
        power: 100,
        powerSpread: 1.5,
      },
    });
  }

  // Spheroid destroy - magenta explosion (spawner, high value)
  if (subject === 'enemy' && property === 'spheroid' && qualifier === 'destroy') {
    return broadcast({
      effect: 'explode',
      props: {
        color: '#FF00AA',
        reset: true,
        centerX: 'random',
        centerY: 'random',
        friction: 2,
        hueSpread: 50,
        lifespan: 800,
        lifespanSpread: 1.6,
        particleCount: 120,
        particleSize: 5,
        power: 120,
        powerSpread: 1.6,
      },
    });
  }

  // Quark destroy - orange explosion (spawner, high value)
  if (subject === 'enemy' && property === 'quark' && qualifier === 'destroy') {
    return broadcast({
      effect: 'explode',
      props: {
        color: '#FF8800',
        reset: true,
        centerX: 'random',
        centerY: 'random',
        friction: 2,
        hueSpread: 40,
        lifespan: 800,
        lifespanSpread: 1.6,
        particleCount: 120,
        particleSize: 5,
        power: 120,
        powerSpread: 1.6,
      },
    });
  }

  // Tank destroy - yellow explosion
  if (subject === 'enemy' && property === 'tank' && qualifier === 'destroy') {
    return broadcast({
      effect: 'explode',
      props: {
        color: '#FFFF00',
        reset: true,
        centerX: 'random',
        centerY: 'random',
        friction: 3,
        hueSpread: 30,
        lifespan: 500,
        lifespanSpread: 1.3,
        particleCount: 60,
        particleSize: 4,
        power: 80,
        powerSpread: 1.4,
      },
    });
  }

  // Family member rescue - green pulse with bitmap
  if (subject === 'family' && property === 'rescue') {
    broadcast({
      effect: 'bitmap',
      drivers: ['rgfx-driver-0001', 'rgfx-driver-0003'],
      props: {
        color: '#00FF00',
        centerX: 'random',
        centerY: 50,
        duration: 500,
        reset: true,
        image: FAMILY_SPRITE,
      },
    });
    return broadcast({
      effect: 'pulse',
      drivers: ['rgfx-driver-0002', 'rgfx-driver-0004'],
      props: {
        color: '#00FF00',
        duration: 400,
      },
    });
  }

  // High enemy counts - danger warnings
  if (subject === 'enemy' && qualifier === 'count') {
    const count = parseInt(payload);
    const enemyType = property;

    // Danger threshold warnings
    if (enemyType === 'electrode' && count >= 10) {
      return broadcast({
        effect: 'pulse',
        props: {
          color: '#FF8800',
          duration: 200,
          fade: true,
        },
      });
    }

    if (enemyType === 'cruise' && count >= 3) {
      return broadcast({
        effect: 'pulse',
        props: {
          color: '#FF0088',
          duration: 200,
          fade: true,
        },
      });
    }
  }

  return false;
}
