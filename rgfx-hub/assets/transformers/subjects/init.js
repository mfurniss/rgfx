import { MATRIX_DRIVERS } from '../global.js';
import { getWorldRecord } from '../utils/world-record.js';

export async function transform({ namespace, subject }, ctx) {
  if (subject === 'init') {
    ctx.broadcast({ effect: 'clear' });

    getWorldRecord(namespace, ctx).then((wr) => {
      if (wr) {
        ctx.broadcast({
          effect: 'scroll_text',
          drivers: MATRIX_DRIVERS,
          props: {
            reset: true,
            text: `${wr.romName.toUpperCase()} WR: ${wr.score} by ${wr.player}, ${
              wr.date
            }`,
            repeat: false,
            speed: 250,
            gradient: ['#700070', '#B0FF00', '#300050', '#700070'],
            gradientSpeed: 6,
            gradientScale: 0.2,
            snapToLed: true,
          },
        });
      }
    });
  }

  return false;
}
