import { sleep, formatNumber } from '../utils/index.js';

import {
  MATRIX_DRIVERS,
  NAMED_DRIVERS,
  SECONDARY_MATRIX_DRIVERS,
} from '../global.js';

export async function transform(
  { subject, property, qualifier, payload },
  { broadcast },
) {
  if (subject === 'init') {
    broadcast({
      effect: 'particle_field',
      drivers: MATRIX_DRIVERS,
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

  if (subject === 'player' && property === 'score') {
    broadcast({
      effect: 'text',
      drivers: [NAMED_DRIVERS.primaryMatrix],
      props: {
        align: 'center',
        text: formatNumber(payload),
        gradient: ['#A0A0A0'],
        accentColor: '#000000',
        duration: 6000,
        reset: true,
      },
    });

    return true;
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

  if (subject === 'enemy' && property === 'destroy') {
    const delta = Number(payload);

    const colors = {
      zako: '#E04400',
      goei: '#C0A000',
      boss: '#00A0FF',
      don: '#FFA0A0',
    };

    broadcast({
      effect: 'explode',
      drivers: MATRIX_DRIVERS,
      props: {
        color: colors[qualifier] ?? '#409040',
        centerX: 'random',
        centerY: 'random',
        particleCount: Math.min(delta, 500),
        power: 150 + delta / 5,
        lifespan: 320 + delta,
        powerSpread: Math.max(30, Math.min(90, Math.round(delta / 3))),
        particleSize: 4,
        hueSpread: 50,
        friction: 3,
        lifespanSpread: 40,
      },
    });

    if (delta > 500 && delta <= 9999) {
      await sleep(150);

      broadcast({
        effect: 'text',
        drivers: SECONDARY_MATRIX_DRIVERS,
        props: {
          text: String(Math.round(delta / 100) * 100),
          gradient: ['#0080FF', '#FFFF00', '#FF0000', '#0080FF'],
          gradientSpeed: 7,
          gradientScale: 0,
          accentColor: '#000000',
          duration: 2000,
          reset: true,
        },
      });
    }
  }

  return true;
}
