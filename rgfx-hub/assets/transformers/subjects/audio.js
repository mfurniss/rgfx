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

const MATRICES = ["rgfx-driver-0001", "rgfx-driver-0005"];

export function transform({ subject, property, payload }, { broadcast }) {
  if (subject !== 'audio') return false;

  // FFT spectrum analyzer - broadcast to all matrix drivers
  if (property === 'fft') {
    const values = JSON.parse(payload);
    return broadcast({
      effect: 'spectrum',
      drivers: MATRICES,
      props: {
        values,
      },
    });
  }

  return false;
}
