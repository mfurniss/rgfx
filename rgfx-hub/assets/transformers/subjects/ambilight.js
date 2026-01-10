/**
 * Ambilight effect transformer
 *
 * Converts ambilight screen edge events to background gradient effects.
 * Events from MAME ambilight.lua module:
 *   rgfx/ambilight/top    F00,0F0,00F,...
 *   rgfx/ambilight/bottom F00,0F0,00F,...
 *   rgfx/ambilight/left   F00,0F0,00F,...
 *   rgfx/ambilight/right  F00,0F0,00F,...
 *
 * @param {import('../../../rgfx-hub/src/types/transformer-types').RgfxTopic} topic
 * @param {import('../../../rgfx-hub/src/types/transformer-types').TransformerContext} context
 * @returns {boolean}
 */

// Map edges to driver IDs
const EDGE_TO_DRIVER = {
  top: 'rgfx-driver-0004',
  bottom: 'rgfx-driver-0007',
  left: 'rgfx-driver-0006',
  right: 'rgfx-driver-0003',
};

export async function transform(
  { subject, property, payload },
  { broadcast, parseAmbilight }
) {
  // Only handle rgfx/ambilight/* events
  if (subject !== 'ambilight') {
    return false;
  }

  // property is the edge: top, bottom, left, right
  const edge = property;
  if (!edge || !['top', 'bottom', 'left', 'right'].includes(edge)) {
    return false;
  }

  // Get target driver for this edge
  const driverId = EDGE_TO_DRIVER[edge];
  if (!driverId) {
    return false;
  }

  // Orientation based on edge (vertical for left/right, horizontal for top/bottom)
  // Note: Strip drivers (height=1) automatically fall back to horizontal in firmware
  const orientation =
    edge === 'left' || edge === 'right' ? 'vertical' : 'horizontal';

  // Parse 12-bit colors to gradient props
  const gradient = parseAmbilight(payload, orientation);

  // Broadcast as background effect to specific driver
  // fadeDuration: 0 for immediate update (ambilight needs instant response)
  broadcast({
    effect: 'background',
    props: { gradient, fadeDuration: 200 },
    drivers: [driverId],
  });

  return true;
}
