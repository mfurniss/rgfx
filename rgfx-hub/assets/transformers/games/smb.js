// Super Mario Bros game-specific mapper

import { randomInt } from '../utils/math.js';
import { sleep } from '../utils/async.js';
import { NAMED_DRIVERS, MATRIX_DRIVERS } from '../global.js';

let currentMusicTrack = null;
let coinGif = null;

export async function transform(
  { subject, property, _qualifier, payload },
  { broadcast, loadGif },
) {
  async function loadBitmaps() {
    if (!coinGif) {
      try {
        coinGif = await loadGif('bitmaps/mario-coin.gif');
      } catch (err) {
        console.error('Failed to load coin GIF:', err);
      }
    }
  }
  // Reset transformer state when game initializes
  if (subject === 'init') {
    currentMusicTrack = null;
    await loadBitmaps();
    return true;
  }

  if (subject === 'player' && property === 'score') {
    return broadcast({
      effect: 'text',
      props: {
        text: payload,
        color: '#D0D0A0',
        accentColor: '#700000',
        align: 'center',
        reset: true,
        duration: 10000,
      },
      drivers: [NAMED_DRIVERS.primaryMatrix],
    });
  }

  if (subject === 'sfx') {
    if (property === 'coin') {
      await loadBitmaps();
      if (coinGif) {
        const centerX = randomInt(0, 100);

        broadcast({
          effect: 'bitmap',
          drivers: MATRIX_DRIVERS,
          props: {
            images: coinGif.images,
            palette: coinGif.palette,
            centerX,
            centerY: 140,
            endX: centerX,
            endY: 15,
            duration: 800,
            easing: 'quarticOut',
            fadeIn: 0,
            fadeOut: 800,
          },
        });
      }
    }

    if (property === 'powerup-appear') {
      for (var i = 0; i < 2; i++) {
        broadcast({
          effect: 'wipe',
          drivers: MATRIX_DRIVERS,
          props: {
            color: i & 1 ? 'purple' : 'yellow',
            direction: 'up',
            duration: 400,
          },
        });
        await sleep(200);
      }
    }

    if (property === 'powerup-collect') {
      for (var i = 0; i < 6; i++) {
        broadcast({
          effect: 'pulse',
          props: {
            color: i & 1 ? 'green' : 'red',
            duration: 500,
            easing: 'quinticInOut',
            fade: true,
            collapse: 'vertical',
          },
        });
        await sleep(150);
      }
    }

    if (property === 'enter-pipe') {
      // Turn off background with empty gradient
      broadcast({
        effect: 'background',
        props: {
          gradient: { colors: [] },
          fadeDuration: 0,
        },
      });
      for (var i = 0; i < 3; i++) {
        broadcast({
          effect: 'wipe',
          drivers: MATRIX_DRIVERS,
          props: {
            color: '#00C000',
            duration: 300,
            direction: 'down',
            blendMode: 'replace',
          },
        });
        await sleep(300);
      }
    }

    if (property === 'mario-fireball') {
      const props = {
        color: '#FF8000',
        reset: false,
        direction: 'left',
        velocity: 1500,
        friction: 0.5,
        trail: 0.2,
        width: 16,
        height: 6,
        lifespan: 1200,
      };
      broadcast({
        effect: 'projectile',
        drivers: [NAMED_DRIVERS.rightStrip],
        props,
      });
      broadcast({
        effect: 'projectile',
        drivers: [NAMED_DRIVERS.rightMatrix, NAMED_DRIVERS.leftStrip],
        props: {
          ...props,
          direction: 'right',
        },
      });
    }

    if (property === 'block-smash') {
      broadcast({
        effect: 'explode',
        drivers: ['*M', '*M'],
        props: {
          color: '#605040',
          reset: false,
          centerX: 'random',
          centerY: 'random',
          friction: 2,
          gravity: 380,
          hueSpread: 0,
          lifespan: 1200,
          lifespanSpread: 10,
          particleCount: 14,
          particleSize: 10,
          power: 180,
          powerSpread: 40,
        },
      });
    }

    if (property === 'firework') {
      return broadcast({
        effect: 'explode',
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
    }
  }

  // Music track changes - different colors per area
  if (subject === 'music') {
    if (payload === currentMusicTrack) {
      return;
    }

    currentMusicTrack = payload;

    console.log('currentMusicTrack', currentMusicTrack);

    // Fade out all ambient effects
    broadcast({
      effect: 'background',
      props: {
        gradient: { colors: [] },
        fadeDuration: 1000,
      },
    });

    broadcast({
      effect: 'plasma',
      props: {
        enabled: 'fadeOut',
      },
    });

    broadcast({
      effect: 'particle_field',
      props: {
        enabled: 'fadeOut',
      },
    });

    if (currentMusicTrack === 'castle') {
      broadcast({
        effect: 'particle_field',
        drivers: [NAMED_DRIVERS.leftMatrix, NAMED_DRIVERS.primaryMatrix],
        props: {
          direction: 'up',
          density: 50,
          speed: 170,
          size: 14,
          color: '#D07000',
          enabled: 'fadeIn',
        },
      });
    } else if (currentMusicTrack === 'overworld') {
      broadcast({
        effect: 'plasma',
        drivers: [
          NAMED_DRIVERS.leftMatrix,
          NAMED_DRIVERS.rightMatrix,
          NAMED_DRIVERS.rightStrip,
          NAMED_DRIVERS.frontStrip,
          NAMED_DRIVERS.leftStrip,
        ],
        props: {
          speed: 0.8,
          scale: 1,
          gradient: ['#4A5058', '#4A5058', '#909090', '#4A5058', '#4A5058'],
          enabled: 'fadeIn',
        },
      });
    } else if (currentMusicTrack === 'underworld') {
      broadcast({
        effect: 'background',
        props: {
          gradient: {
            colors: ['#000060', '#000030'],
            orientation: 'vertical',
          },
          fadeDuration: 1000,
        },
      });
    } else if (currentMusicTrack === 'flag') {
      for (var i = 0; i < 20; i++) {
        broadcast({
          effect: 'explode',
          drivers: ['*', '*'],
          props: {
            color: '#C0C060',
            reset: false,
            centerX: 'random',
            centerY: 'random',
            friction: 3,
            hueSpread: 0,
            lifespan: 700,
            lifespanSpread: 50,
            gravity: 100,
            particleCount: 100,
            particleSize: 6,
            power: 120,
            powerSpread: 80,
          },
        });
        await sleep(250);
      }
    } else if (currentMusicTrack === 'swimming') {
      broadcast({
        effect: 'plasma',
        props: {
          speed: 1.5,
          scale: 1.5,
          gradient: [
            '#002851',
            '#003e74',
            '#12706d',
            '#00424a',
            '#00473c',
            '#002851',
          ],
          enabled: 'fadeIn',
        },
      });
    } else if (currentMusicTrack === 'power-star') {
      broadcast({
        effect: 'plasma',
        props: {
          enabled: 'off',
        },
      });
      async function loop() {
        broadcast({
          effect: 'wipe',
          props: {
            color: 'random',
            reset: false,
            direction: 'random',
            duration: 600,
            blendMode: 'additive',
          },
        });
        await sleep(400);
        if (currentMusicTrack === 'power-star') {
          loop();
        }
      }
      loop();
    }
  }

  // Let other handlers try if we don't match
  return false;
}
