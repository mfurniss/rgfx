import { formatNumber, sleep } from '../utils.js';
import { NAMED_DRIVERS } from '../global.js';

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

export async function transform({ subject, property, payload }, { broadcast }) {
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
        drivers: [i & 1 ? NAMED_DRIVERS.leftStrip : NAMED_DRIVERS.rightStrip],
        props: {
          color: '#56006e',
          direction: i & 1 ? 'right' : 'left',
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

  if (subject === 'boss' && property === 'tractor-beam') {
    const props = {
      speed: 16,
      scale: 0,
      orientation: 'horizontal',
      gradient: ['#00FFFF', '#0060FF', '#000080'],
    };

    broadcast({
      effect: 'warp',
      props: {
        ...props,
        enabled: 'fadeIn',
      },
    });

    await sleep(4200);

    broadcast({
      effect: 'warp',
      props: {
        ...props,
        enabled: 'fadeOut',
      },
    });

    return true;
  }

  if (subject === 'enemy' && property === 'destroy') {
    broadcast({
      effect: 'explode',
      drivers: ['*', '*'],
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
}
