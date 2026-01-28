/**
 * Ambilight effect transformer
 *
 * Converts ambilight screen edge events to background gradient effects.
 * Handles combined frame events from MAME ambilight.lua module:
 *   rgfx/ambilight/frame  F00,0F0|F00,0F0|F00,0F0|F00,0F0  (top|right|bottom|left)
 *
 * Supports two modes:
 * - multi: Each edge broadcasts to a separate driver (4 drivers total)
 * - single: All edges combined into one gradient on a single driver
 *
 * @param {import('../../../rgfx-hub/src/types/transformer-types').RgfxTopic} topic
 * @param {import('../../../rgfx-hub/src/types/transformer-types').TransformerContext} context
 * @returns {boolean}
 */

// Payload edge order (fixed by Lua - clockwise from bottom-left)
const EDGE_ORDER = ['left', 'top', 'right', 'bottom'];

const CONFIG = {
  mode: 'single', // 'multi' or 'single'

  // Multi-driver mode: each edge to separate driver
  multiDriver: {
    top: 'rgfx-driver-0004',
    bottom: 'rgfx-driver-0007',
    left: 'rgfx-driver-0006',
    right: 'rgfx-driver-0003',
  },

  // Single-driver mode: all edges to one driver
  singleDriver: {
    drivers: ['rgfx-driver-0002'],
    startCorner: 'bottom-left', // 'bottom-left', 'top-left', 'top-right', 'bottom-right'
    aspectRatio: [16, 10], // [width, height] - 13" MacBook Air
  },
};

// Edge order for each starting corner (clockwise)
const CORNER_EDGE_ORDER = {
  'bottom-left': ['left', 'top', 'right', 'bottom'],
  'top-left': ['top', 'right', 'bottom', 'left'],
  'top-right': ['right', 'bottom', 'left', 'top'],
  'bottom-right': ['bottom', 'left', 'top', 'right'],
};

/**
 * Parse combined payload: "F00,0F0|F00,0F0|F00,0F0|F00,0F0" (top|right|bottom|left)
 * @param {string} payload
 * @returns {Record<string, string>} Map of edge to colors string
 */
function parseCombinedPayload(payload) {
  const parts = payload.split('|');
  const edges = {};
  for (let i = 0; i < parts.length && i < EDGE_ORDER.length; i++) {
    edges[EDGE_ORDER[i]] = parts[i];
  }
  return edges;
}

/**
 * Interpolate colors array to target count
 * @param {string[]} colors - Source colors
 * @param {number} targetCount - Target number of colors
 * @returns {string[]}
 */
function interpolateColors(colors, targetCount) {
  if (colors.length === 0) return [];
  if (colors.length === targetCount) return colors;

  const result = [];
  for (let i = 0; i < targetCount; i++) {
    const srcIdx = (i / (targetCount - 1)) * (colors.length - 1);
    const idx = Math.round(srcIdx);
    result.push(colors[Math.min(idx, colors.length - 1)]);
  }
  return result;
}

/**
 * Calculate color count per edge based on aspect ratio
 * @param {number} totalColors - Total colors to distribute
 * @param {[number, number]} aspectRatio - [width, height]
 * @returns {{ top: number, right: number, bottom: number, left: number }}
 */
function calculateEdgeColorCounts(totalColors, aspectRatio) {
  const [w, h] = aspectRatio;
  const perimeter = 2 * (w + h);

  const horizontal = Math.round((w / perimeter) * totalColors);
  const vertical = Math.round((h / perimeter) * totalColors);

  return {
    top: horizontal,
    right: vertical,
    bottom: horizontal,
    left: vertical,
  };
}

/**
 * Handle multi-driver mode: broadcast each edge to its assigned driver
 */
function handleMultiDriver(edges, context) {
  const { broadcast, parseAmbilight } = context;

  for (const [edge, colors] of Object.entries(edges)) {
    const driverId = CONFIG.multiDriver[edge];
    if (!driverId) continue;

    const orientation =
      edge === 'left' || edge === 'right' ? 'vertical' : 'horizontal';

    // Reverse the left edge gradient
    let payload = colors;
    if (edge === 'left') {
      payload = colors.split(',').reverse().join(',');
    }

    const gradient = parseAmbilight(payload, orientation);

    broadcast({
      effect: 'background',
      props: { gradient, fadeDuration: 200 },
      drivers: [driverId],
    });
  }
}

/**
 * Handle single-driver mode: combine all edges into one gradient
 * Colors are weighted by aspect ratio so horizontal edges get more colors
 */
function handleSingleDriver(edges, context) {
  const { broadcast, parseAmbilight } = context;
  const { drivers, startCorner, aspectRatio } = CONFIG.singleDriver;

  // Get edge order for this starting corner (clockwise)
  const edgeOrder = CORNER_EDGE_ORDER[startCorner];

  // Count total source colors
  let totalSourceColors = 0;
  for (const edge of edgeOrder) {
    if (edges[edge]) {
      totalSourceColors += edges[edge].split(',').length;
    }
  }

  // Calculate weighted color counts per edge
  const colorCounts = calculateEdgeColorCounts(totalSourceColors, aspectRatio);

  // Build combined gradient by concatenating edges in order
  const combinedColors = [];

  for (const edge of edgeOrder) {
    const colorsStr = edges[edge];
    if (!colorsStr) continue;

    // Parse 12-bit colors to 24-bit hex
    const parsed = parseAmbilight(colorsStr, 'horizontal');
    const edgeColors = parsed.colors;

    // Interpolate to weighted count
    const weighted = interpolateColors(edgeColors, colorCounts[edge]);
    combinedColors.push(...weighted);
  }

  if (combinedColors.length === 0) return;

  console.log('combinedColors', combinedColors);

  broadcast({
    effect: 'background',
    props: {
      gradient: { colors: combinedColors, orientation: 'horizontal' },
      fadeDuration: 200,
    },
    drivers,
  });
}

export async function transform({ subject, property, payload }, context) {
  // Only handle rgfx/ambilight/frame events
  if (subject !== 'ambilight' || property !== 'frame') {
    return false;
  }

  // Parse combined payload
  const edges = parseCombinedPayload(payload);
  if (Object.keys(edges).length === 0) {
    return false;
  }

  if (CONFIG.mode === 'single') {
    handleSingleDriver(edges, context);
  } else {
    handleMultiDriver(edges, context);
  }

  return true;
}
