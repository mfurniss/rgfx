import { NAMED_DRIVERS } from '../global.js';

export async function transform({ subject, property, payload }, { broadcast }) {
  if (subject === 'game' && property === 'time') {
    const seconds = Number(payload);
    const color =
      seconds <= 10 ? '#FF0000' : seconds <= 20 ? '#C07000' : '#707000';
    broadcast({
      effect: 'text',
      drivers: [NAMED_DRIVERS.leftMatrix, NAMED_DRIVERS.rightMatrix],
      props: {
        align: 'center',
        text: payload,
        gradient: [color],
        accentColor: '#000000',
        duration: seconds <= 10 ? 700 : 2000,
        reset: true,
      },
    });
    return true;
  }

  if (subject === 'music' && property === 'fm') {
    broadcast({
      effect: 'music',
      drivers: [NAMED_DRIVERS.primaryMatrix],
      props: {
        channels: payload,
        decayRate: 2.5,
      },
    });

    return true;
  }
}
