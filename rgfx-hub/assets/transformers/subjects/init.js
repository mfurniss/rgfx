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
            gradient: ['#808000'],
            accentColor: '#006060',
            speed: 250,
            snapToLed: false,
          },
        });
      }
    });
  }

  return false;
}
