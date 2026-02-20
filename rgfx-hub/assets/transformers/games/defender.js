import { sleep, formatNumber, randomInt } from '../utils/index.js';
import {
  MATRIX_DRIVERS,
  NAMED_DRIVERS,
  SECONDARY_MATRIX_DRIVERS,
} from '../global.js';

let scoreHue = 0;

export async function transform(
  { subject, property, qualifier, payload },
  { broadcast, hslToHex },
) {
  if (subject === 'player' && property === 'score' && Number(payload) > 0) {
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

  if (subject === 'player' && property === 'explode') {
    await sleep(400);

    broadcast({
      effect: 'explode',
      props: {
        color: 'white',
        reset: false,
        centerX: 50,
        centerY: 50,
        friction: 3,
        gravity: 0,
        hueSpread: 0,
        lifespan: 1800,
        lifespanSpread: 80,
        particleCount: 500,
        particleSize: 6,
        power: 300,
        powerSpread: 95,
      },
    });
  }

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

  if (subject === 'humanoid' && property === 'rescue') {
    broadcast({
      effect: 'text',
      drivers: SECONDARY_MATRIX_DRIVERS,
      props: {
        text: '500',
        gradient: ['#0080FF', '#FFFF00', '#FF0000', '#0080FF'],
        gradientSpeed: 7,
        gradientScale: 3,
        accentColor: '#000000',
        duration: 2500,
        reset: true,
      },
    });

    return true;
  }

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
}
