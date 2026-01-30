/**
 * Audio events mapper - handles system-level audio events
 *
 * Handles rgfx/audio/* events:
 * - rgfx/audio/fft - FFT spectrum analyzer data (payload is JSON array of values 0-9)
 *
 * These events use the reserved 'rgfx' namespace and are routed directly
 * to subject handlers, bypassing game transformer lookup.
 *
 * @param {import('../../../rgfx-hub/src/types/transformer-types').RgfxTopic} topic
 * @param {string} payload
 * @param {import('../../../rgfx-hub/src/types/transformer-types').TransformerContext} context
 * @returns {boolean}
 */

import { MATRIX_DRIVERS } from '../global.js';

export function transform({ subject, property, payload }, { broadcast }) {
  // FFT spectrum analyzer - broadcast to all matrix drivers
  if (subject === 'audio' && property === 'fft') {
    const values = JSON.parse(payload);

    return broadcast({
      effect: 'spectrum',
      drivers: MATRIX_DRIVERS,
      props: {
        values,
      },
    });
  }

  return false;
}
