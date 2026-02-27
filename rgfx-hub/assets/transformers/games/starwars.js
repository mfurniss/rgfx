/**
 * Star Wars (Atari 1983) Transformer
 */

// 5 Remember, the force will be with you
// 13 space
// 21 trench
// 29 attract mode crawl
// 31 instructions
// 33 scoring
// 35 high score
// 37 crawl
// 49 space
// 57 trench
// 56,58 game over
// 34, 36, 38 going in
// 17,18 fly away from death star
// 42 DS surface

import {
  randomInt,
  sleep,
  formatNumber,
  trackedTimeout,
} from '../utils/index.js';
import { NAMED_DRIVERS, MATRIX_DRIVERS } from '../global.js';

let laserIndex = 0;
let gameState;
let scoreLatch = true;
let goingIn = false;

function blockScore() {
  scoreLatch = false;
  trackedTimeout(() => {
    scoreLatch = true;
  }, 3000);
}

export async function transform(
  { subject, property, qualifier, payload },
  { broadcast },
) {
  if (subject === 'game' && property === 'state') {
    gameState = payload;

    if (payload == 5) {
      return broadcast({
        effect: 'scroll_text',
        props: {
          gradient: ['#409040'],
          reset: true,
          text: 'Remember, The Force will be with you',
          speed: 300,
          repeat: false,
          snapToLed: true,
          gradientSpeed: 2.6,
          gradientScale: 1.2,
        },
      });
    }

    if (payload == 12 || payload == 6) {
      // Attract mode logo and 3D crawl
      broadcast({
        effect: 'particle_field',
        props: {
          direction: 'left',
          density: 16,
          speed: 60,
          size: 5,
          color: '707070',
          enabled: 'fadeIn',
        },
      });
    }

    // trench
    if (payload == 39 || payload == 46) {
      blockScore();

      return broadcast({
        effect: 'scroll_text',
        props: {
          gradient: ['#409040'],
          reset: true,
          text: 'Use The Force, Luke',
          speed: 300,
          repeat: false,
          snapToLed: false,
          gradientSpeed: 2.6,
          gradientScale: 1.2,
        },
      });
    }

    // going in
    if (payload == 36 || payload == 37 || payload == 38) {
      if (goingIn) {
        //return true;
      }

      trackedTimeout(() => {
        goingIn = false;
      }, 10000);

      goingIn = true;

      const commonProps = {
        density: 100,
        speed: 320,
        size: 16,
        color: '#808080',
        enabled: 'fadeIn',
      };

      broadcast({
        effect: 'particle_field',
        drivers: [
          NAMED_DRIVERS.leftMatrix,
          NAMED_DRIVERS.leftStrip,
          NAMED_DRIVERS.rightStrip,
        ],
        props: {
          direction: 'left',
          ...commonProps,
        },
      });

      broadcast({
        effect: 'particle_field',
        drivers: [NAMED_DRIVERS.rightMatrix],
        props: {
          direction: 'right',
          ...commonProps,
        },
      });

      await sleep(500);

      broadcast({
        effect: 'scroll_text',
        drivers: [NAMED_DRIVERS.primaryMatrix],
        props: {
          gradient: ['#D00000'],
          reset: true,
          text: "Red Five - I'm going in",
          reset: true,
          speed: 400,
          snapToLed: true,
        },
      });

      await sleep(3500);

      broadcast({
        effect: 'particle_field',
        drivers: [
          NAMED_DRIVERS.rightStrip,
          NAMED_DRIVERS.leftStrip,
          NAMED_DRIVERS.rightMatrix,
          NAMED_DRIVERS.leftMatrix,
        ],
        props: {
          enabled: 'fadeOut',
        },
      });
    }

    if (payload == 51) {
      blockScore();

      await sleep(1000);

      return broadcast({
        effect: 'scroll_text',
        props: {
          reset: true,
          text: 'Death Star Destroyed',
          accentColor: '',
          speed: 300,
          repeat: false,
          snapToLed: false,
          gradientSpeed: 20,
          gradientScale: 0.2,
          gradient: [
            '#FF0000',
            '#FFFF00',
            '#00FF00',
            '#00FFFF',
            '#0000FF',
            '#FF00FF',
            '#FF0000',
          ],
        },
      });
    }

    if (payload == 56 || payload == 58) {
      // game over
      broadcast({
        effect: 'pulse',
        props: {
          color: '#D00000',
          reset: true,
          duration: 5000,
          easing: 'quinticInOut',
          fade: true,
          collapse: 'horizontal',
        },
      });
    }

    if (payload == 14) {
      // Select difficulty
      broadcast({
        effect: 'particle_field',
        props: {
          direction: 'left',
          density: 25,
          speed: 60,
          size: 7,
          color: '808080',
          enabled: 'fadeOut',
        },
      });

      broadcast({
        effect: 'text',
        drivers: [NAMED_DRIVERS.primaryMatrix],
        props: {
          gradient: ['#A00000'],
          reset: true,
          text: 'Red Five',
          accentColor: '#000080',
          x: 0,
          y: 0,
          duration: 1000,
          align: 'center',
        },
      });

      await sleep(800);

      broadcast({
        effect: 'text',
        drivers: [NAMED_DRIVERS.primaryMatrix],
        props: {
          gradient: ['#A00000'],
          reset: true,
          text: 'Standing By',
          accentColor: '#000080',
          x: 0,
          y: 0,
          duration: 1000,
          align: 'center',
        },
      });
    }
  }

  if (subject === 'player' && property === 'score' && scoreLatch) {
    broadcast({
      effect: 'text',
      props: {
        text: formatNumber(payload),
        gradient: ['#008000'],
        accentColor: '#000000',
        duration: 6000,
        reset: true,
      },
      drivers: [NAMED_DRIVERS.primaryMatrix], // 96x8 matrix
    });
    // await sleep(1);
    broadcast({
      effect: 'text',
      props: {
        text: formatNumber(payload),
        gradient: ['#80FF80'],
        duration: 200,
        align: 'center',
        // reset: false,
      },
      drivers: [NAMED_DRIVERS.primaryMatrix], // 96x8 matrix
    });
  }

  // Player fires X-wing laser cannons
  if (gameState !== 14 && subject === 'player' && property === 'fire') {
    const direction = laserIndex++ & 1 ? 'left' : 'right';

    const drivers =
      direction === 'right'
        ? [NAMED_DRIVERS.leftStrip]
        : [NAMED_DRIVERS.rightStrip];

    const commonProps = {
      direction,
      velocity: 3000,
      friction: 0.5,
      width: 32,
      height: 4,
      lifespan: 1000,
    };

    for (var i = 0; i < 2; i++) {
      broadcast({
        effect: 'projectile',
        drivers,
        props: {
          ...commonProps,
          color: i === 0 ? '#007070' : '#005050',
          trail: 0.1,
        },
      });

      await sleep(100);

      broadcast({
        effect: 'projectile',
        drivers,
        props: {
          ...commonProps,
          color: i === 0 ? '#000060' : '#000040',
          trail: 0.2,
        },
      });

      await sleep(100);
    }
  }

  // TIE fighter destroyed
  if (subject === 'enemy' && property === 'destroy' && qualifier === 'tie') {
    const centerX = randomInt(0, 100);
    const centerY = randomInt(0, 100);

    broadcast({
      effect: 'explode',
      drivers: MATRIX_DRIVERS,
      props: {
        color: 'green',
        reset: false,
        centerX,
        centerY,
        friction: 1,
        hueSpread: 30,
        lifespan: 1500,
        lifespanSpread: 2,
        particleCount: 40,
        particleSize: 8,
        power: 90,
        powerSpread: 50,
      },
    });

    return broadcast({
      effect: 'explode',
      drivers: MATRIX_DRIVERS,
      props: {
        color: 'white',
        reset: false,
        centerX,
        centerY,
        friction: 3,
        hueSpread: 30,
        lifespan: 500,
        lifespanSpread: 2,
        particleCount: 70,
        particleSize: 3,
        power: 160,
        powerSpread: 50,
      },
    });
  }

  // Fireball destroyed
  if (
    subject === 'enemy' &&
    property === 'destroy' &&
    qualifier === 'fireball'
  ) {
    broadcast({
      effect: 'explode',
      drivers: MATRIX_DRIVERS,
      props: {
        color: '#600060',
        reset: false,
        centerX: randomInt(0, 100),
        centerY: randomInt(0, 100),
        friction: 3,
        hueSpread: 30,
        lifespan: 1000,
        lifespanSpread: 1,
        particleCount: 25,
        particleSize: 8,
        power: 100,
        powerSpread: 50,
      },
    });
  }

  if (
    subject === 'enemy' &&
    property === 'destroy' &&
    (qualifier === 'turret' || qualifier === 'laser-bunker')
  ) {
    const centerX = randomInt(0, 100);
    const centerY = randomInt(0, 100);

    broadcast({
      effect: 'explode',
      drivers: MATRIX_DRIVERS,
      props: {
        color: 'red',
        reset: false,
        centerX,
        centerY,
        friction: 4,
        hueSpread: 0,
        lifespan: 1200,
        lifespanSpread: 60,
        particleCount: 60,
        particleSize: 6,
        power: 150,
        powerSpread: 70,
      },
    });

    broadcast({
      effect: 'explode',
      drivers: MATRIX_DRIVERS,
      props: {
        color: '#FFFF00',
        reset: false,
        centerX,
        centerY,
        friction: 8,
        gravity: 0,
        hueSpread: 0,
        lifespan: 500,
        lifespanSpread: 50,
        particleCount: 30,
        particleSize: 6,
        power: 120,
        powerSpread: 10,
      },
    });

    return true;
  }

  if (
    subject === 'enemy' &&
    property === 'destroy' &&
    qualifier === 'laser-tower'
  ) {
    broadcast({
      effect: 'explode',
      props: {
        color: 'white',
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
    broadcast({
      effect: 'pulse',
      props: {
        color: '#A0A000',
        reset: false,
        duration: 2500,
        easing: 'quinticInOut',
        fade: true,
        collapse: 'horizontal',
      },
    });
  }

  // Darth Vader hit
  if (subject === 'enemy' && property === 'destroy' && qualifier === 'vader') {
    broadcast({
      effect: 'pulse',
      props: {
        color: '#FF00FF',
        reset: false,
        duration: 1500,
        easing: 'quinticOut',
        fade: true,
        collapse: 'random',
      },
    });
    await sleep(100);
    for (var i = 0; i < 8; i++) {
      broadcast({
        effect: 'explode',
        drivers: ['*', '*'],
        props: {
          color: '#FF00FF',
          reset: false,
          centerX: 'random',
          centerY: 'random',
          friction: 7,
          gravity: 0,
          hueSpread: 0,
          lifespan: 600,
          lifespanSpread: 100,
          particleCount: 150,
          particleSize: 8,
          power: 500,
          powerSpread: 20,
        },
      });
      await sleep(80);
    }
  }

  // Death Star destroyed
  if (
    subject === 'enemy' &&
    property === 'destroy' &&
    qualifier === 'death-star'
  ) {
    for (var i = 0; i < 10; i++) {
      broadcast({
        effect: 'explode',
        props: {
          color: '#A00000',
          hueSpread: 0,
          reset: false,
          centerX: 50,
          centerY: 50,
          friction: 2,
          lifespan: 1000,
          lifespanSpread: 0,
          particleCount: 45,
          particleSize: 5,
          power: 300,
          powerSpread: 20,
          scalePower: true,
        },
      });

      await sleep(150);
    }

    await sleep(200);

    for (var i = 0; i < 7; i++) {
      broadcast({
        effect: 'explode',
        props: {
          color: '#0000E0',
          reset: false,
          centerX: 50,
          centerY: 50,
          friction: 2,
          hueSpread: 0,
          lifespan: 1000,
          lifespanSpread: 0,
          particleCount: 45,
          particleSize: 5,
          power: 300,
          powerSpread: 20,
          scalePower: true,
        },
      });

      await sleep(150);
    }

    await sleep(450);

    broadcast({
      effect: 'explode',
      props: {
        color: 'white',
        reset: false,
        centerX: 50,
        centerY: 50,
        friction: 30,
        lifespan: 2000,
        lifespanSpread: 50,
        particleCount: 10,
        particleSize: 6,
        power: 150,
        powerSpread: 50,
      },
    });

    await sleep(150);

    broadcast({
      effect: 'explode',
      props: {
        reset: true,
        color: 'white',
        centerX: 50,
        centerY: 50,
        friction: 1.5,
        hueSpread: 40,
        lifespan: 4000,
        lifespanSpread: 50,
        particleCount: 500,
        particleSize: 5,
        power: 250,
        powerSpread: 100,
        scalePower: true,
      },
    });
  }

  // Shield reduced
  if (subject === 'player' && property === 'shield-reduced') {
    (async () => {
      for (var i = 0; i < 7; i++) {
        broadcast({
          effect: 'pulse',
          props: {
            color: 'random',
            reset: false,
            duration: 800,
            easing: 'quinticOut',
            fade: true,
            collapse: i & 1 ? 'horizontal' : 'vertical',
          },
        });
        await sleep(150);
      }
    })();

    return true;
  }
}
