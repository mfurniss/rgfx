// Super Street Fighter II game transformer
// Stub — add visual effects here. See the ssf2_rgfx.lua interceptor for SFX command IDs.
import { MATRIX_DRIVERS } from '../global.js';

export function transform({ subject, property, payload }, { broadcast }) {
  if (subject === 'sound' && property === 'cmd') {
    broadcast({
      effect: 'text',
      drivers: MATRIX_DRIVERS,
      props: {
        text: payload,
        gradient: ['#FFD700'],
        align: 'center',
        duration: 1500,
        reset: true,
      },
    });
  }
}
