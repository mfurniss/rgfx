// Galaga 88 game-specific mapper

import { formatNumber } from '../utils/index.js';
import { NAMED_DRIVERS } from '../global.js';

export function transform({ subject, property, payload }, { broadcast }) {
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
        drivers: [i & 1 ? NAMED_DRIVERS.rightStrip : NAMED_DRIVERS.leftStrip],
        props: {
          color: '#46005e',
          direction: i & 1 ? 'left' : 'right',
          velocity: 1800,
          friction: 0.5,
          trail: 0.3,
          particleDensity: 20,
          width: 12,
          lifespan: 2000,
        },
      });
    }
  }

  // Enemy destroyed - particle explosion
  if (subject === 'enemy' && property === 'destroy') {
    return broadcast({
      effect: 'explode',
      drivers: ['*', '*'],
      props: {
        color: '#FF4400',
        centerX: 'random',
        centerY: 'random',
        particleCount: 80,
        power: 180,
        lifespan: 380,
        powerSpread: 40,
        particleSize: 4,
        hueSpread: 40,
        friction: 3,
        lifespanSpread: 40,
      },
    });
  }

  // Sound effects - color based on effect number in payload
  if (subject === 'sound' && property === 'effect') {
    // const effectNum = parseInt(payload);
    // const color = EFFECT_COLORS[effectNum] || "#FFFFFF";
    // return broadcast({
    //   effect: "pulse",
    //   props: {
    //     color,
    //     duration: 150,
    //   },
    // });
  }
}
