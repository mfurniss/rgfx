import {
  randomInt,
  randomElement,
  sleep,
  formatNumber,
  pick,
  exclusive,
} from '../utils/index.js';
import { ALL_DRIVERS, MATRIX_DRIVERS, NAMED_DRIVERS } from '../global.js';

function randomDrivers(n = 2) {
  return pick(ALL_DRIVERS, n);
}

const flashHumanProgramming = exclusive(
  async (cancelled, broadcast, hslToHex) => {
    let h = randomInt(359);
    const colors = [
      ...Array.from({ length: 15 }, () => {
        const color = hslToHex(h, 100, 50);
        h = (h + randomInt(80, 280)) % 360;
        return color;
      }),
      '#000000',
    ];
    for (const color of colors) {
      if (cancelled()) break;
      broadcast({
        effect: 'background',
        props: {
          gradient: {
            colors: [color],
            orientation: 'horizontal',
          },
          fadeDuration: 0,
        },
      });
      await sleep(70);
    }
  },
);

export async function transform(
  { subject, property, qualifier, payload },
  { broadcast, hslToHex },
) {
  // Let init events pass through to subject handlers (for world record fetch)
  if (subject === 'init') {
    return false;
  }

  if (subject === 'entity' && qualifier === 'spawn') {
    if (property === 'enforcer') {
      broadcast({
        effect: 'sparkle',
        props: {
          duration: 400,
          density: 100,
          gradient: ['#000000', '#00FFFF', '#000000'],
          speed: 2,
          bloom: 90,
          reset: false,
        },
      });
    }

    if (property === 'spark') {
      for (var i = 0; i < 3; i++) {
        broadcast({
          effect: 'bitmap',
          drivers: ['*', '*', '*'],
          props: {
            reset: false,
            centerX: randomInt(-30, 130),
            centerY: randomInt(-30, 130),
            endX: randomInt(-30, 130),
            endY: randomInt(-30, 130),
            duration: randomInt(900, 1300),
            easing: 'linear',
            fadeIn: 300,
            fadeOut: 300,
            palette: [
              hslToHex(randomInt(360), 100, 50),
              hslToHex(randomInt(360), 100, 50),
            ],
            frameRate: 12,
            images: [
              [
                '0.....0',
                '.0...0.',
                '..0.0..',
                '...0...',
                '..0.0..',
                '.0...0.',
                '0.....0',
              ],
              [
                '...1...',
                '...1...',
                '...1...',
                '1111111',
                '...1...',
                '...1...',
                '...1...',
              ],
            ],
          },
        });
      }
    }
  }

  if (subject === 'entity' && qualifier === 'destroy') {
    if (property === 'electrode') {
      return broadcast({
        effect: 'pulse',
        drivers: randomDrivers(),
        props: {
          color: 'random',
          reset: false,
          duration: 700,
          easing: 'quinticOut',
          fade: true,
          collapse: 'random',
        },
      });
    }

    if (property === 'enforcer') {
      broadcast({
        effect: 'explode',
        drivers: ['*', '*'],
        props: {
          color: '#80D0FF',
          centerX: 'random',
          centerY: 'random',
          friction: 6,
          lifespan: 800,
          lifespanSpread: 0,
          particleCount: 150,
          particleSize: 3,
          power: 400,
          powerSpread: 100,
        },
      });
    }

    if (property === 'brain') {
      broadcast({
        effect: 'explode',
        drivers: ['*', '*'],
        props: {
          color: '#0000FF',
          centerX: 'random',
          centerY: 'random',
          friction: 3,
          hueSpread: 140,
          lifespan: 800,
          lifespanSpread: 80,
          particleCount: 250,
          particleSize: 4,
          power: 200,
          powerSpread: 90,
        },
      });
    }

    if (property === 'grunt') {
      const drivers = randomDrivers();

      for (const collapse of ['vertical', 'horizontal']) {
        broadcast({
          effect: 'pulse',
          drivers,
          props: {
            color: '#B00000',
            reset: false,
            duration: 600,
            easing: 'quinticOut',
            fade: true,
            collapse,
          },
        });

        await sleep(100);
      }
    }

    if (property === 'quark') {
      const drivers = randomDrivers();

      for (const collapse of ['horizontal', 'vertical', 'horizontal']) {
        broadcast({
          effect: 'pulse',
          drivers,
          props: {
            color: randomElement(['#0000FF', '#C000C0', '#00C0C0']),
            reset: false,
            duration: 600,
            easing: 'quinticOut',
            fade: true,
            collapse,
          },
        });

        await sleep(70);
      }
    }

    if (property === 'tank') {
      const event = {
        effect: 'explode',
        drivers: randomDrivers(),
        props: {
          color: '#FF0000',
          reset: false,
          centerX: randomInt(100),
          centerY: randomInt(100),
          friction: 1,
          lifespan: 700,
          lifespanSpread: 50,
          particleCount: 100,
          particleSize: 6,
          power: 150,
          powerSpread: 80,
        },
      };
      broadcast(event);
      event.props.color = '#FFFFFF';
      event.props.particleCount = 50;
      broadcast(event);
    }

    if (property === 'spheroid') {
      const centerX = randomInt(100);
      const centerY = randomInt(100);
      const drivers = randomDrivers();

      broadcast({
        effect: 'explode',
        drivers,
        props: {
          color: '#B0B0B0',
          reset: false,
          centerX,
          centerY,
          friction: 3,
          gravity: 0,
          hueSpread: 0,
          lifespan: 600,
          lifespanSpread: 0,
          particleCount: 70,
          particleSize: 6,
          power: 120,
          powerSpread: 0,
        },
      });
      await sleep(120);
      broadcast({
        effect: 'explode',
        drivers,
        props: {
          color: '#FF0000',
          reset: false,
          centerX,
          centerY,
          friction: 3,
          gravity: 0,
          hueSpread: 0,
          lifespan: 700,
          lifespanSpread: 0,
          particleCount: 70,
          particleSize: 6,
          power: 160,
          powerSpread: 20,
        },
      });
    }
  }

  if (subject === 'entity' && property === 'tank') {
    if (qualifier === 'spawn') {
      const props = {
        speed: 5,
        scale: 1.7,
        gradient: [
          '#000000',
          '#FF0000',
          '#000000',
          '#000000',
          '#A0A0A0',
          '#000000',
          '#000000',
          '#FF0000',
          '#000000',
        ],
      };
      broadcast({ effect: 'plasma', props: { ...props, enabled: 'on' } });
      broadcast({ effect: 'plasma', props: { ...props, enabled: 'fadeOut' } });
    }
  }

  if (subject === 'sfx') {
    if (property === 'game-start') {
      const props = {
        speed: 3.25,
        scale: 7.83,
        gradient: [
          '#18617b',
          '#090a05',
          '#d96330',
          '#6d396f',
          '#211e25',
          '#161313',
          '#308aa1',
          '#18617b',
        ],
      };

      broadcast({
        effect: 'plasma',
        props: { ...props, enabled: 'on' },
      });

      await sleep(700);

      broadcast({
        effect: 'plasma',
        props: { ...props, enabled: 'fadeOut' },
      });
    }

    if (property === 'shoot-hulk') {
      return broadcast({
        effect: 'pulse',
        drivers: ['*', '*'],
        props: {
          color: '#006000',
          reset: false,
          duration: 400,
          easing: 'quinticOut',
          fade: true,
          collapse: 'random',
        },
      });
    }

    if (property === 'brain-appear') {
      const props = {
        speed: 15,
        scale: 10,
        gradient: [
          '#000000',
          '#A0A0A0',
          '#000000',
          '#000000',
          '#FF00FF',
          '#000000',
          '#000000',
          '#D0D0D0',
          '#000000',
          '#000000',
          '#0000FF',
          '#000000',
          '#000000',
          '#A0A0A0',
          '#000000',
        ],
      };

      broadcast({
        effect: 'plasma',
        props: {
          ...props,
          enabled: 'fadeIn',
        },
      });

      await sleep(2000);
      return broadcast({
        effect: 'plasma',
        props: {
          ...props,
          enabled: 'fadeOut',
        },
      });
    }

    if (property === 'rescue-human') {
      for (var i = -10; i <= 110; i += 30) {
        const hue = 300 + Math.random() * 60;
        broadcast({
          effect: 'bitmap',
          props: {
            reset: false,
            centerX: 50,
            centerY: 50,
            endX: i,
            endY: randomInt(-25, 125),
            duration: 1000,
            easing: 'quadraticOut',
            fadeIn: 300,
            fadeOut: 300,
            palette: [hslToHex(hue, 100, 65)],
            frameRate: 2,
            images: [
              [
                '.000...000.',
                '00000.00000',
                '00000000000',
                '00000000000',
                '.000000000.',
                '..0000000..',
                '....000....',
                '.....0.....',
              ],
            ],
          },
        });
      }
    }

    if (property === 'human-programming') {
      flashHumanProgramming(broadcast, hslToHex);
    }

    if (property === 'human-die') {
      for (var i = -2; i <= 2; i++) {
        broadcast({
          drivers: MATRIX_DRIVERS,
          effect: 'bitmap',
          props: {
            reset: false,
            centerX: 50,
            centerY: 50,
            endX: 50 + i * 25,
            duration: 1000 + Math.abs(i) * 200,
            easing: 'quadraticOut',
            fadeIn: 300,
            fadeOut: 300,
            palette: [hslToHex(0, 0, 90 - Math.abs(i) * 20)],
            frameRate: 2,
            images: [
              [
                '..00000..',
                '.0000000.',
                '000000000',
                '00..0..00',
                '0...0...0',
                '0...0...0',
                '000000000',
                '000000000',
                '.0.0.0.0.',
                '.0.0.0.0.',
                '..00000..',
                '...000...',
              ],
            ],
          },
        });
      }
    }

    if (property === 'enforcer-spawn') {
      broadcast({
        effect: 'sparkle',
        props: {
          duration: 300,
          density: 100,
          gradient: ['#000000', '#00FFFF', '#000000'],
          speed: 2,
          bloom: 90,
          reset: false,
        },
      });
    }

    if (property == 'extra-life') {
      broadcast({
        effect: 'scroll_text',
        props: {
          reset: true,
          text: 'Extra Life!',
          gradient: [
            '#004233',
            '#009e96',
            '#ccb400',
            '#ff003c',
            '#bcaaca',
            '#004233',
          ],
          gradientSpeed: 10,
          gradientScale: 4.2,
          accentColor: '#000000',
          speed: 300,
          repeat: false,
          snapToLed: true,
        },
      });
    }

    if (property === 'player-death') {
      return broadcast({
        effect: 'explode',
        props: {
          color: '#FFFFFF',
          reset: false,
          centerX: 50,
          centerY: 50,
          friction: 3,
          gravity: 0,
          hueSpread: 0,
          lifespan: 2000,
          lifespanSpread: 70,
          particleCount: 400,
          particleSize: 10,
          power: 300,
          powerSpread: 100,
        },
      });
    }

    // console.log('sfx for', property, 'undefined');
  }
  // Player fire - directional green wipe
  // if (subject === 'player' && property === 'fire') {
  //   const wipeDirection = FIRE_DIRECTION_MAP[payload] || 'right';
  //   return broadcast({
  //     effect: 'wipe',
  //     props: {
  //       color: '#00FF00',
  //       duration: 250,
  //       direction: wipeDirection,
  //     },
  //   });
  // }

  if (subject === 'wave' && property === 'number' && payload > 1) {
    const props = {
      speed: 5,
      scale: 3,
      orientation: 'horizontal',
      gradient: [
        '#A07000',
        '#C0C0C0',
        '#A07000',
        '#C0C0C0',
        '#A07000',
        '#C0C0C0',
        '#00A0A0',
        '#A000A0',
        '#00A0A0',
        '#A000A0',
        '#00A0A0',
        '#A000A0',
        '#0000A0',
        '#A00000',
        '#0000A0',
        '#A00000',
        '#0000A0',
        '#A00000',
      ],
    };
    broadcast({
      effect: 'warp',
      props: {
        ...props,
        enabled: 'fadeIn',
      },
    });

    await sleep(700);

    broadcast({
      effect: 'scroll_text',
      drivers: [NAMED_DRIVERS.leftMatrix, NAMED_DRIVERS.rightMatrix],
      props: {
        reset: true,
        text: `Wave ${payload}`,
        accentColor: '',
        speed: 200,
        repeat: false,
        snapToLed: false,
        gradientSpeed: 4.5,
        gradientScale: 0.18,
        gradient: [
          '#600060',
          '#0000FF',
          '#00FFFF',
          '#FFFFFF',
          '#FFFF00',
          '#FF0000',
          '#600060',
        ],
      },
    });

    await sleep(700);

    return broadcast({
      effect: 'warp',
      props: {
        ...props,
        enabled: 'fadeOut',
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
        accentColor: '#000000',
        duration: 4000,
        reset: true,
        gradient: [
          '#FF0000',
          '#FFFF00',
          '#00FF00',
          '#00FFFF',
          '#0000FF',
          '#FF00FF',
          '#FF0000',
        ],
        gradientSpeed: 2,
        gradientScale: 0,
      },
    });
  }

  // if (subject === 'player' && property === 'lives') {
  //   if (payload != livesRemaining) {
  //     livesRemaining = payload;
  //     broadcast({
  //       effect: 'text',
  //       drivers: [NAMED_DRIVERS.leftMatrix, NAMED_DRIVERS.rightMatrix],
  //       props: {
  //         align: 'center',
  //         text: `L:${Number(livesRemaining) + 1}`,
  //         duration: 6000,
  //         reset: true,
  //         gradient: [
  //           '#FF0000',
  //           '#FFFF00',
  //           '#00FF00',
  //           '#00FFFF',
  //           '#0000FF',
  //           '#FF00FF',
  //           '#FF0000',
  //         ],
  //         gradientSpeed: 3,
  //         gradientScale: 0,
  //         accentColor: '#0000C0',
  //       },
  //     });
  //   }
  // }

  return true;
}
