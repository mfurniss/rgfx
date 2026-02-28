import {
  sleep,
  formatNumber,
  randomInt,
  hslToRgb,
  trackedTimeout,
  debounce,
} from '../utils/index.js';

import {
  MATRIX_DRIVERS,
  NAMED_DRIVERS,
  SECONDARY_MATRIX_DRIVERS,
} from '../global.js';

const smallExplosion = debounce((broadcast, color, delta) => {
  broadcast({
    effect: 'explode',
    drivers: MATRIX_DRIVERS,
    props: {
      color,
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
}, 500);

const STARFIELD_DRIVERS = [
  ...MATRIX_DRIVERS,
  NAMED_DRIVERS.leftStrip,
  NAMED_DRIVERS.rightStrip,
];

export async function transform(
  { subject, property, qualifier, payload },
  { broadcast, log, state },
) {
  const SCORE_THROTTLE_MS = 100;

  function broadcastScore(score) {
    broadcast({
      effect: 'text',
      drivers: [NAMED_DRIVERS.primaryMatrix],
      props: {
        text: formatNumber(score),
        gradient: ['#808080'],
        accentColor: '#000000',
        duration: 6000,
        reset: true,
      },
    });
  }

  function starfield() {
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

  async function particleWarp() {
    function update({ density, speed, size }) {
      broadcast({
        effect: 'particle_field',
        drivers: STARFIELD_DRIVERS,
        props: {
          direction: 'down',
          enabled: 'on',
          density: Math.round(density),
          speed,
          size: Math.round(size),
          color: randomInt(2) ? hslToRgb(randomInt(0, 359), 1, 0.5) : '#B0B0B0',
        },
      });
    }

    for (let i = 0; i <= 1; i += 0.1) {
      update({
        density: 30 + i * 50,
        speed: 50 + i * 300,
        size: 4 + i * 6,
      });
      await sleep(100);
    }

    for (let i = 0; i <= 100; i += 1) {
      update({
        density: 100,
        speed: 400,
        size: 16,
      });
      await sleep(40);
    }

    for (let i = 0.9; i >= 0.1; i -= 0.1) {
      update({
        density: 30 + i * 50,
        speed: 50 + i * 300,
        size: 4 + i * 6,
      });
      await sleep(100);
    }

    starfield();
  }

  if (subject === 'init') {
    starfield();
    state.delete('score');
  }

  if (subject === 'screen' && property === 'text') {
    if (payload === 'DIMENSION WARP') {
      particleWarp();
    } else if (payload === 'START!' || payload === 'READY') {
      broadcast({
        effect: 'text',
        drivers: [NAMED_DRIVERS.primaryMatrix],
        props: {
          text: payload,
          gradient: ['#A00000'],
          accentColor: '#000000',
          duration: 3000,
          reset: true,
        },
      });
      await sleep(2500);

      if (payload === 'START!') {
        await particleWarp();
      }
    } else if (payload === 'PERFECT') {
      broadcast({
        effect: 'text',
        drivers: ['rgfx-driver-0005'],
        props: {
          reset: false,
          text: 'PERFECT !!',
          gradient: [
            '#FF0000',
            '#FFFF00',
            '#00FF00',
            '#00FFFF',
            '#0000FF',
            '#FF00FF',
            '#FF0000',
          ],
          gradientSpeed: 5,
          gradientScale: 5,
          accentColor: '#000000',
          duration: 5000,
        },
      });
      await sleep(200);

      for (var i = 0; i < 60; i++) {
        broadcast({
          effect: 'explode',
          drivers: ['*', '*'],
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
    } else {
      broadcast({
        effect: 'scroll_text',
        drivers: [NAMED_DRIVERS.leftMatrix, NAMED_DRIVERS.rightMatrix],
        props: {
          reset: true,
          text: payload,
          gradient: ['#B00000', '#B00000', '#D0D0D0', '#B00000', '#B00000'],
          gradientSpeed: 7,
          gradientScale: -4.2,
          accentColor: null,
          speed: 250,
          repeat: false,
          snapToLed: true,
        },
      });
    }
  }

  if (subject === 'player' && property === 'score') {
    const s = state.get('score') || { lastSent: 0 };
    s.latest = payload;

    const now = Date.now();

    if (now - s.lastSent >= SCORE_THROTTLE_MS) {
      broadcastScore(payload);
      s.lastSent = now;
    } else if (!s.timerPending) {
      s.timerPending = true;
      const delay = SCORE_THROTTLE_MS - (now - s.lastSent);
      trackedTimeout(() => {
        s.timerPending = false;
        broadcastScore(s.latest);
        s.lastSent = Date.now();
      }, delay);
    }

    state.set('score', s);
    return true;
  }

  if (subject === 'player' && property === 'fire') {
    for (var i = 0; i < 2; i++) {
      broadcast({
        effect: 'projectile',
        drivers: [NAMED_DRIVERS.rightStrip, NAMED_DRIVERS.leftStrip],
        props: {
          color: '#46005e',
          direction: 'right',
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
    if (qualifier === 'don') {
      (async () => {
        for (var i = 0; i < 3; i++) {
          broadcast({
            effect: 'pulse',
            drivers: [
              NAMED_DRIVERS.frontStrip,
              NAMED_DRIVERS.leftMatrix,
              NAMED_DRIVERS.rightMatrix,
            ],
            props: {
              color: 'random',
              reset: false,
              duration: 500,
              easing: 'quinticOut',
              fade: true,
              collapse: i & 1 ? 'horizontal' : 'vertical',
            },
          });
          await sleep(80);
        }
      })();

      return true;
    }

    let delta = Number(payload);

    const colors = {
      zako: '#E04400',
      goei: '#C0A000',
      boss: '#00A0FF',
      'don-attack': '#FFA0A0',
      hiyoko: '#A0A0A0',
    };

    if (!colors[qualifier]) {
      log.warn('unknown enemy type', qualifier, delta);
    }

    const color = colors[qualifier] ?? '#409040';

    if (delta === 100) {
      smallExplosion(broadcast, color, delta);
    } else {
      broadcast({
        effect: 'explode',
        drivers: MATRIX_DRIVERS,
        props: {
          color,
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
    }

    if (delta > 500 && delta <= 9999) {
      await sleep(150);

      if (delta === 1100) {
        delta = 1000;
      }

      broadcast({
        effect: 'text',
        drivers: SECONDARY_MATRIX_DRIVERS,
        props: {
          text: String(delta),
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
