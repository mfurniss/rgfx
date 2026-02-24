import { formatNumber, sleep, randomInt } from '../utils/index.js';
import { MATRIX_DRIVERS, NAMED_DRIVERS } from '../global.js';

const STARFIELD_DRIVERS = [
  ...MATRIX_DRIVERS,
  NAMED_DRIVERS.leftStrip,
  NAMED_DRIVERS.rightStrip,
];

const EXPLOSION_DRIVERS = [...MATRIX_DRIVERS, NAMED_DRIVERS.frontStrip];

function pickTwo(array) {
  const i = Math.floor(Math.random() * array.length);
  let j;
  do {
    j = Math.floor(Math.random() * array.length);
  } while (j === i);
  return [array[i], array[j]];
}

const bonusColors = {
  150: '#C0C0C0',
  400: '#F00000',
  800: '#D09000',
  1000: '#4000E0',
  1500: '#00E000',
  1600: '#00E0E0',
  2000: '#E0E000',
  3000: '#F0F0F0',
};

let tractorBeam = false;

export async function transform({ subject, property, payload }, { broadcast }) {
  if (subject === 'init') {
    broadcast({
      effect: 'particle_field',
      drivers: STARFIELD_DRIVERS,
      props: {
        direction: 'down',
        density: 40,
        speed: 50,
        size: 1,
        color: '#606060',
        enabled: 'fadeIn',
      },
    });
  }

  if (subject === 'player' && property === 'score' && Number(payload) > 0) {
    broadcast({
      effect: 'text',
      drivers: [NAMED_DRIVERS.primaryMatrix],
      props: {
        align: 'center',
        text: formatNumber(payload),
        gradient: ['#808060'],
        accentColor: '#603000',
        duration: 6000,
        reset: true,
      },
    });

    return true;
  }

  if (subject === 'stage') {
    const isChallengingStage = !(Number(payload) - 3) % 4;

    broadcast({
      effect: 'text',
      props: { reset: true, duration: 0, text: '' },
    });

    broadcast({
      effect: 'scroll_text',
      drivers: MATRIX_DRIVERS,
      props: {
        text: isChallengingStage ? 'CHALLENGING STAGE' : `STAGE ${payload}`,
        gradient: ['#008050'],
        speed: 220,
        repeat: false,
        snapToLed: true,
      },
    });
  }

  if (subject === 'player' && property === 'captured') {
    broadcast({
      effect: 'warp',
      props: {
        enabled: 'fadeOut',
      },
    });

    await sleep(500);

    tractorBeam = false;

    broadcast({
      effect: 'scroll_text',
      drivers: MATRIX_DRIVERS,
      props: {
        text: 'FIGHTER CAPTURED',
        gradient: ['#A00000'],
        speed: 250,
        repeat: false,
        snapToLed: true,
      },
    });
  }

  if (subject === 'bonus' && property === 'score') {
    const color = bonusColors[payload];

    if (color) {
      broadcast({
        effect: 'text',
        drivers: [NAMED_DRIVERS.leftMatrix, NAMED_DRIVERS.rightMatrix],
        props: {
          align: 'center',
          text: payload,
          gradient: [color],
          duration: 1700,
          reset: false,
        },
      });
    }

    return true;
  }

  if (subject === 'player' && property === 'fire') {
    for (var i = 0; i < 2; i++) {
      broadcast({
        effect: 'projectile',
        drivers: [NAMED_DRIVERS.leftStrip, NAMED_DRIVERS.rightStrip],
        props: {
          color: '#56006e',
          direction: 'right',
          velocity: 1800,
          friction: 0.5,
          trail: 0.3,
          width: 16,
          lifespan: 2000,
        },
      });
    }

    return true;
  }

  if (subject === 'boss' && property === 'tractor-beam' && !tractorBeam) {
    tractorBeam = true;

    const props = {
      speed: 16,
      scale: 0,
      orientation: 'horizontal',
      gradient: ['#00A0A0', '#0040A0', '#000050'],
    };

    broadcast({
      effect: 'warp',
      props: {
        ...props,
        enabled: 'fadeIn',
      },
    });

    await sleep(8000);

    broadcast({
      effect: 'warp',
      props: {
        enabled: 'fadeOut',
      },
    });

    tractorBeam = false;

    return true;
  }

  if (subject === 'enemy' && property === 'destroy') {
    broadcast({
      effect: 'explode',
      drivers: pickTwo(EXPLOSION_DRIVERS),
      props: {
        color: '#FF7000',
        reset: false,
        centerX: 'random',
        centerY: 'random',
        friction: 3,
        gravity: 0,
        hueSpread: 60,
        lifespan: 400,
        lifespanSpread: 60,
        particleCount: 40,
        particleSize: 4,
        power: 220,
        powerSpread: 80,
      },
    });

    return true;
  }

  if (subject === 'bonus' && property === 'perfect') {
    await sleep(200);

    for (var i = 0; i < 60; i++) {
      broadcast({
        effect: 'explode',
        drivers: pickTwo(EXPLOSION_DRIVERS),
        props: {
          color: 'random',
          reset: false,
          centerX: 'random',
          centerY: 'random',
          friction: 3,
          gravity: 0,
          hueSpread: 0,
          lifespan: 700,
          lifespanSpread: 50,
          particleCount: 100,
          particleSize: 6,
          power: 120,
          powerSpread: 80,
        },
      });

      await sleep(randomInt(20, 150));
    }
  }
}
