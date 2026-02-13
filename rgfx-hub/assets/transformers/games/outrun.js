import { MATRIX_DRIVERS } from '../global.js';

export async function transform({ subject, property, payload }, { broadcast }) {
  if (subject === 'music' && property === 'fm') {
    broadcast({
      effect: 'music',
      drivers: MATRIX_DRIVERS,
      props: {
        channels: payload,
        decayRate: 2.5,
      },
    });

    return true;
  }
}
