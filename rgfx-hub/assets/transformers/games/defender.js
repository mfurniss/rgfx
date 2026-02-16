import { sleep, formatNumber, randomInt } from '../utils/index.js';
import { MATRIX_DRIVERS, NAMED_DRIVERS } from '../global.js';

let scoreHue = 0;

export async function transform(
  { subject, property, qualifier, payload },
  { broadcast, hslToHex },
) {
  // Let init events pass through to subject handlers
  // if (subject === 'init') {
  //   return false;
  // }

  if (subject === 'player' && property === 'score') {
    const color = hslToHex(scoreHue, 100, 30);
    scoreHue = (scoreHue + 30) % 360;
    broadcast({
      effect: 'text',
      drivers: [NAMED_DRIVERS.primaryMatrix],
      props: {
        text: formatNumber(payload),
        gradient: [color],
        accentColor: '#000000',
        duration: 5000,
        reset: true,
      },
    });

    return true;
  }

  // if (subject === 'player' && property === 'lives') {
  //   if (payload != livesRemaining) {
  //     livesRemaining = payload;
  //     broadcast({
  //       effect: 'text',
  //       drivers: [NAMED_DRIVERS.leftMatrix, NAMED_DRIVERS.rightMatrix],
  //       props: {
  //         align: 'center',
  //         text: `L:${Number(livesRemaining)}`,
  //         duration: 6000,
  //         reset: true,
  //         gradient: ['#0080FF', '#00FFFF', '#FFFFFF', '#00FFFF', '#0080FF'],
  //         gradientSpeed: 3,
  //         gradientScale: 0,
  //         accentColor: '#001040',
  //       },
  //     });
  //   }
  //   return true;
  // }

  if (subject === 'player' && property === 'fire') {
    const effect = {
      effect: 'projectile',
      drivers: [NAMED_DRIVERS.leftStrip],
      props: {
        color: 'random',
        direction: 'right',
        velocity: 2500,
        friction: 0.5,
        trail: 0,
        width: 30,
        height: 1,
        lifespan: 1200,
        particleDensity: 40,
      },
    };

    broadcast(effect);

    effect.drivers = [NAMED_DRIVERS.rightStrip];
    effect.props.direction = 'left';
    broadcast(effect);

    return true;
  }

  // // -- Player death --
  // if (subject === 'player' && property === 'die') {
  //   return broadcast({
  //     effect: 'explode',
  //     props: {
  //       color: '#80C0FF',
  //       reset: false,
  //       centerX: 50,
  //       centerY: 50,
  //       friction: 3,
  //       gravity: 0,
  //       hueSpread: 30,
  //       lifespan: 2000,
  //       lifespanSpread: 70,
  //       particleCount: 400,
  //       particleSize: 10,
  //       power: 300,
  //       powerSpread: 100,
  //     },
  //   });
  // }

  // // -- Smart bomb used --
  // if (subject === 'player' && property === 'smart-bomb-used') {
  //   broadcast({
  //     effect: 'background',
  //     props: {
  //       gradient: {
  //         colors: ['#FFFFFF'],
  //         orientation: 'horizontal',
  //       },
  //       fadeDuration: 0,
  //     },
  //   });
  //   await sleep(100);
  //   broadcast({
  //     effect: 'explode',
  //     props: {
  //       color: '#FFFFFF',
  //       reset: false,
  //       centerX: 50,
  //       centerY: 50,
  //       friction: 2,
  //       gravity: 0,
  //       hueSpread: 60,
  //       lifespan: 1500,
  //       lifespanSpread: 50,
  //       particleCount: 600,
  //       particleSize: 12,
  //       power: 400,
  //       powerSpread: 50,
  //     },
  //   });
  //   await sleep(200);
  //   broadcast({
  //     effect: 'background',
  //     props: {
  //       gradient: {
  //         colors: ['#000000'],
  //         orientation: 'horizontal',
  //       },
  //       fadeDuration: 500,
  //     },
  //   });
  //   return true;
  // }

  // // -- Smart bomb count display --
  // if (subject === 'player' && property === 'smart-bombs') {
  //   broadcast({
  //     effect: 'text',
  //     drivers: [NAMED_DRIVERS.leftMatrix, NAMED_DRIVERS.rightMatrix],
  //     props: {
  //       align: 'center',
  //       text: `B:${payload}`,
  //       duration: 3000,
  //       reset: true,
  //       gradient: ['#FFFFFF', '#FFFF00', '#FF8000'],
  //       gradientSpeed: 2,
  //       gradientScale: 0,
  //       accentColor: '#200000',
  //     },
  //   });
  //   return true;
  // }

  // -- Humanoid lost --
  if (subject === 'humanoid' && property === 'lost') {
    return broadcast({
      effect: 'pulse',
      drivers: ['*', '*'],
      props: {
        color: '#00A000',
        reset: false,
        duration: 500,
        easing: 'quinticOut',
        fade: true,
        collapse: 'random',
      },
    });
  }

  // -- All humanoids lost (planet explodes) --
  if (subject === 'humanoid' && property === 'all-lost') {
    const props = {
      speed: 8,
      scale: 3,
      gradient: [
        '#FF0000',
        '#000000',
        '#FF4000',
        '#000000',
        '#FF8000',
        '#000000',
        '#FF0000',
        '#000000',
      ],
    };
    broadcast({
      effect: 'plasma',
      props: { ...props, enabled: 'on' },
    });
    await sleep(2000);
    broadcast({
      effect: 'plasma',
      props: { ...props, enabled: 'fadeOut' },
    });
    return true;
  }

  if (subject === 'enemy' && qualifier === 'destroy') {
    if (property === 'lander') {
      broadcast({
        effect: 'explode',
        drivers: MATRIX_DRIVERS,
        props: {
          color: '#00FF00',
          centerX: 'random',
          centerY: 'random',
          friction: 4,
          lifespan: 700,
          particleCount: 30,
          particleSize: 5,
          power: 300,
          powerSpread: 20,
        },
      });
    }

    if (property === 'mutant') {
      broadcast({
        effect: 'explode',
        drivers: MATRIX_DRIVERS,
        props: {
          color: '#FF00FF',
          centerX: 'random',
          centerY: 'random',
          friction: 4,
          hueSpread: 80,
          lifespan: 500,
          lifespanSpread: 50,
          particleCount: 50,
          particleSize: 5,
          power: 300,
          powerSpread: 60,
        },
      });
    }

    if (property === 'baiter') {
      broadcast({
        effect: 'explode',
        drivers: MATRIX_DRIVERS,
        props: {
          color: '#80FF00',
          centerX: 'random',
          centerY: 'random',
          friction: 4,
          hueSpread: 80,
          lifespan: 500,
          lifespanSpread: 50,
          particleCount: 70,
          particleSize: 5,
          power: 300,
          powerSpread: 60,
        },
      });
    }

    if (property === 'bomber') {
      const hue = randomInt(360);

      const props = {
        color: hslToHex(hue, 100, 50),
        duration: 800,
        easing: 'quinticOut',
        fade: true,
        collapse: 'horizontal',
      };

      broadcast({
        drivers: MATRIX_DRIVERS,
        effect: 'pulse',
        props,
      });

      await sleep(50);

      props.color = hslToHex(hue + 180, 100, 50);
      props.collapse = 'vertical';

      broadcast({
        drivers: MATRIX_DRIVERS,
        effect: 'pulse',
        props,
      });
    }

    if (property === 'pod') {
      const centerX = randomInt(100);
      const centerY = randomInt(100);

      broadcast({
        effect: 'explode',
        drivers: MATRIX_DRIVERS,
        props: {
          color: '#FFFFFF',
          centerX,
          centerY,
          friction: 4,
          lifespan: 600,
          lifespanSpread: 50,
          particleCount: 70,
          particleSize: 5,
          power: 400,
          powerSpread: 70,
        },
      });

      broadcast({
        effect: 'explode',
        drivers: MATRIX_DRIVERS,
        props: {
          color: '#FF0000',
          centerX,
          centerY,
          friction: 4,
          lifespan: 1000,
          lifespanSpread: 50,
          particleCount: 40,
          particleSize: 5,
          power: 400,
          powerSpread: 70,
        },
      });
    }

    if (property === 'swarmer') {
      broadcast({
        effect: 'explode',
        drivers: MATRIX_DRIVERS,
        props: {
          color: '#FF0000',
          centerX: 'random',
          centerY: 'random',
          friction: 4,
          lifespan: 700,
          particleCount: 30,
          particleSize: 5,
          power: 300,
          powerSpread: 20,
        },
      });
    }

    return true;
  }

  // Swarmer - yellow pulse (small fast enemies from pods)
  // if (
  //   subject === 'enemy' &&
  //   property === 'swarmer' &&
  //   qualifier === 'destroy'
  // ) {
  //   return broadcast({
  //     effect: 'pulse',
  //     drivers: ['*', '*'],
  //     props: {
  //       color: '#C0C000',
  //       reset: false,
  //       duration: 300,
  //       easing: 'quinticOut',
  //       fade: true,
  //       collapse: 'random',
  //     },
  //   });
  // }

  // return true;
}
