import { randomInt } from '../utils/math.js';
import { sleep } from '../utils/async.js';
import { PICO8_PALETTE } from '../palettes.js';
import {
  PACMAN_SPRITE_OPEN_MOUTH,
  PACMAN_SPRITE_CLOSED_MOUTH,
  PACMAN_SPRITE_DIM_OPEN_MOUTH,
  PACMAN_SPRITE_DIM_CLOSED_MOUTH,
  GHOST_SCARED_BLUE,
  GHOST_SCARED_WHITE,
  GHOST_EYES_RIGHT,
  GHOST_EYES_LEFT,
} from '../bitmaps/pacman-sprites.js';
import { STRIP_DRIVERS, NAMED_DRIVERS } from '../global.js';

const BONUS_ITEMS = {
  cherry: { score: 100, file: 'pac-bonus-1-cherry.gif' },
  strawberry: { score: 300, file: 'pac-bonus-2-strawberry.gif' },
  orange: { score: 500, file: 'pac-bonus-3-orange.gif' },
  apple: { score: 700, file: 'pac-bonus-4-apple.gif' },
  melon: { score: 1000, file: 'pac-bonus-5-melon.gif' },
  galaxian: { score: 2000, file: 'pac-bonus-6-galaxian.gif' },
  bell: { score: 3000, file: 'pac-bonus-7-bell.gif' },
  key: { score: 5000, file: 'pac-bonus-8-key.gif' },
};

const MATRIX_DRIVERS = [
  'rgfx-driver-0001',
  'rgfx-driver-0005',
  'rgfx-driver-0010',
];

let dotCount = 0;
let bonusLatch = false;

export async function transform(
  { subject, property, payload },
  { broadcast, loadGif },
) {
  if (bonusLatch === false && subject === 'player' && property === 'score') {
    return broadcast({
      effect: 'text',
      drivers: [NAMED_DRIVERS.primaryMatrix],
      props: {
        text: payload,
        color: '#A0A000',
        accentColor: '#000080',
        duration: 5000,
        reset: true,
      },
    });
  }

  if (subject === 'player' && property === 'insert-coin') {
    broadcast({
      effect: 'scroll_text',
      props: {
        reset: true,
        text: '',
        repeat: false,
      },
    });

    return broadcast({
      effect: 'text',
      drivers: [NAMED_DRIVERS.primaryMatrix],
      props: {
        color: '#f4f6f5',
        reset: true,
        text: '+ Credit +',
        duration: 1000,
        gradientSpeed: 12,
        gradientScale: 10,
        gradient: [
          '#f19f5f',
          '#38a7ad',
          '#8f9e9d',
          '#f39044',
          '#b3b5cc',
          '#73bade',
          '#659f78',
          '#f19f5f',
        ],
      },
    });
  }

  if (subject === 'player' && property === 'eat') {
    if (payload === 'dot') {
      dotCount++;

      broadcast({
        effect: 'wipe',
        drivers: ['*S'],
        props: {
          color: '#856e4f',
          duration: 300,
          direction: 'random',
          blendMode: 'additive',
          reset: false,
        },
      });

      return broadcast({
        effect: 'bitmap',
        drivers: MATRIX_DRIVERS,
        props: {
          reset: false,
          centerX: 'random',
          centerY: 'random',
          endX: '',
          endY: '',
          duration: 500,
          easing: 'quadraticInOut',
          fadeIn: 200,
          fadeOut: 200,
          palette: PICO8_PALETTE,
          images: [
            dotCount & 1
              ? PACMAN_SPRITE_DIM_OPEN_MOUTH
              : PACMAN_SPRITE_DIM_CLOSED_MOUTH,
          ],
        },
      });
    }

    if (payload === 'energizer') {
      broadcast({
        effect: 'pulse',
        drivers: STRIP_DRIVERS,
        props: {
          color: '#0000FF',
          reset: false,
          duration: 8000,
          easing: 'quarticInOut',
          fade: true,
          collapse: 'random',
        },
      });

      broadcast({
        effect: 'bitmap',
        drivers: MATRIX_DRIVERS,
        props: {
          reset: false,
          centerX: -30,
          centerY: 50,
          endX: 130,
          endY: 50,
          duration: 3000,
          easing: 'linear',
          fadeIn: 300,
          fadeOut: 300,
          palette: PICO8_PALETTE,
          images: [GHOST_SCARED_BLUE, GHOST_SCARED_WHITE],
          frameRate: 3,
        },
      });

      await sleep(1500);

      broadcast({
        effect: 'bitmap',
        drivers: MATRIX_DRIVERS,
        props: {
          reset: false,
          centerX: -30,
          centerY: 50,
          endX: 130,
          endY: 50,
          duration: 2000,
          easing: 'linear',
          fadeIn: 300,
          fadeOut: 300,
          palette: PICO8_PALETTE,
          images: [PACMAN_SPRITE_OPEN_MOUTH, PACMAN_SPRITE_CLOSED_MOUTH],
          frameRate: 7,
        },
      });
    }

    if (payload.startsWith('ghost')) {
      bonusLatch = true;

      setTimeout(() => {
        bonusLatch = false;
      }, 3000);

      const score = {
        ghost1: '200',
        ghost2: '400',
        ghost3: '800',
        ghost4: '1600',
      }[payload];

      broadcast({
        effect: 'pulse',
        props: {
          color: '#D00090',
          reset: false,
          duration: 1200,
          easing: 'quarticInOut',
          fade: true,
          collapse: 'random',
        },
      });

      broadcast({
        effect: 'text',
        drivers: MATRIX_DRIVERS,
        props: {
          text: score,
          color: '#FFFF70',
          accentColor: '#0000A0',
          align: 'center',
          duration: 2000,
          reset: true,
        },
      });

      await sleep(300);

      const i = randomInt(1);

      broadcast({
        effect: 'bitmap',
        drivers: MATRIX_DRIVERS,
        props: {
          reset: false,
          centerX: i ? -10 : 110,
          centerY: randomInt(100),
          endX: i ? 110 : -10,
          endY: randomInt(100),
          duration: randomInt(2000, 3000),
          easing: 'linear',
          fadeIn: 300,
          fadeOut: 300,
          palette: PICO8_PALETTE,
          images: [i ? GHOST_EYES_RIGHT : GHOST_EYES_LEFT],
          frameRate: 3,
        },
      });
    }

    const bonusItem = BONUS_ITEMS[payload];

    if (bonusItem) {
      if (!bonusItem.sprite) {
        try {
          bonusItem.sprite = await loadGif(`bitmaps/${bonusItem.file}`);
        } catch (err) {
          console.error(`Failed to load bonus sprite ${payload}:`, err);
        }
      }

      if (bonusItem.sprite) {
        for (let i = 0; i < 10; i++) {
          broadcast({
            effect: 'bitmap',
            drivers: MATRIX_DRIVERS,
            props: {
              reset: false,
              centerX: randomInt(100),
              centerY: randomInt(100),
              endX: i & 1 ? 140 : -140,
              endY: randomInt(-200, 200),
              duration: 2000,
              easing: 'quadraticInOut',
              fadeIn: 200,
              fadeOut: 300,
              images: bonusItem.sprite.images,
              palette: bonusItem.sprite.palette,
            },
          });
          await sleep(200);
        }
      }
    }
  }

  if (subject === 'player' && property === 'die') {
    const part = parseInt(payload);
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FFFF00',
        duration: part === 1 ? 1700 : 300,
        easing: 'quinticOut',
        fade: true,
        collapse: 'random',
        reset: false,
      },
    });
  }

  if (subject === 'level' && property === 'complete') {
    await sleep(2000);

    for (let i = 0; i < 8; i++) {
      broadcast({
        effect: 'background',
        props: {
          gradient: { colors: [i & 1 ? '#0000A0' : '#909090'] },
          fadeDuration: 0,
        },
      });
      await sleep(180);
    }

    // Empty gradient turns off background
    broadcast({
      effect: 'background',
      props: {
        gradient: { colors: [] },
        fadeDuration: 0,
      },
    });
  }
}
