/**
 * Sound channel events mapper - creates FFT-like visualization effect
 *
 * Handles sound/channel/1-4 events from NES APU sound channels:
 * - Channel 1: Square Wave 1 (melody) - Red
 * - Channel 2: Square Wave 2 (harmony) - Green
 * - Channel 3: Triangle Wave (bass) - Blue
 * - Channel 4: Noise (percussion) - Yellow
 *
 * @param {import('../../../src/types/mapping-types').RgfxTopic} topic
 * @param {string} payload
 * @param {import('../../../src/types/mapping-types').MappingContext} context
 * @returns {boolean}
 */
export function handle({ subject, property, qualifier }, payload, { broadcast }) {
  if (subject !== 'sound') return false;

  // Handle sound channel events for FFT simulation
  if (property === 'channel' && payload === 'note_on') {
    const channel = parseInt(qualifier, 10);
    let color;
    let driverId;

    switch (channel) {
      case 1: // Square Wave 1 - melody (high frequencies)
        color = '#FF0000'; // Red
        driverId = 'rgfx-driver-0001';
        break;
      case 2: // Square Wave 2 - harmony (mid-high frequencies)
        color = '#00FF00'; // Green
        driverId = 'rgfx-driver-0002';
        break;
      case 3: // Triangle Wave - bass (low frequencies)
        color = '#0000FF'; // Blue
        driverId = 'rgfx-driver-0003';
        break;
      case 4: // Noise - percussion (full spectrum)
        color = '#FFFF00'; // Yellow
        driverId = 'rgfx-driver-0004';
        break;
      default:
        return false; // Unknown channel
    }

    return broadcast({
      effect: 'pulse',
      props: {
        color,
        duration: 100, // Fast pulse for music reactivity
        fade: true,
      },
      drivers: [driverId],
    });
  }

  return false;
}
