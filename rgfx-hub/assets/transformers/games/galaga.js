import { scaleLinear } from '../utils/math.js';
import { formatNumber } from '../utils/format.js';
import { NAMED_DRIVERS } from '../global.js';

const shipPositionScale = scaleLinear(17, 225, 13, 88);

// Galaga mapper - see pacman.js for format example
export function transform({ subject, property, payload }, { broadcast }) {
  // Score display on driver 0005
  if (subject === 'player' && property === 'score') {
    return broadcast({
      effect: 'text',
      drivers: [NAMED_DRIVERS.primaryMatrix],
      props: {
        align: 'center',
        text: formatNumber(payload),
        gradient: ['#808060'],
        accentColor: '#603000',
        duration: 3000,
        reset: true,
      },
    });
  }

  if (subject === 'player' && property === 'fire') {
    for (var i = 0; i < 2; i++) {
      broadcast({
        effect: 'projectile',
        drivers: [i & 1 ? NAMED_DRIVERS.leftStrip : NAMED_DRIVERS.rightStrip],
        props: {
          color: '#56006e',
          direction: i & 1 ? 'left' : 'right',
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

  if (subject === 'player' && property === 'ship' && payload >= 17) {
    return true;
    return broadcast({
      effect: 'bitmap',
      drivers: [NAMED_DRIVERS.leftMatrix],
      props: {
        color: '#0000FF',
        reset: true,
        centerY: Math.floor(shipPositionScale(Number(payload))),
        duration: 400,
        images: [
          [
            '   AA   ',
            '   AA   ',
            '   AA   ',
            'A AAAA A',
            'A AAAA A',
            'AAAAAAAA',
            'A AAAA A',
            'A  AA  A',
          ],
        ],
      },
    });
  }

  if (subject === 'enemy' && property === 'destroy') {
    return broadcast({
      effect: 'explode',
      drivers: ['*', '*'],
      props: {
        color: 'random',
        centerX: 'random',
        centerY: 'random',
        particleCount: 80,
        power: 200,
        lifespan: 500,
        powerSpread: 60,
        particleSize: 6,
        hueSpread: 40,
        friction: 3,
        lifespanSpread: 1.4,
      },
    });
  }
}
