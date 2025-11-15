/**
 * Pac-Man game-specific mapper
 *
 * Handles Pac-Man/Ms. Pac-Man specific events:
 * - pacman/player/score/p1 - Player score (yellow pulse, intensity based on score)
 * - pacman/player/pill/state - Power pill state (blue when active, red when inactive)
 * - pacman/ghost/{color}/state - Individual ghost states with color-coded effects
 *
 * Selective Driver Routing:
 * You can optionally target specific drivers by adding a "drivers" array to the broadcast payload:
 *   broadcast({
 *     effect: "pulse",
 *     props: { color: "#FF0000" },
 *     drivers: ["rgfx-driver-0001", "rgfx-driver-0002"]  // Driver IDs
 *   })
 *
 * If no "drivers" array is provided, the effect broadcasts to all connected drivers.
 *
 * @param {string} topic - Event topic (e.g., "pacman/player/score/p1")
 * @param {string} payload - Event payload (e.g., "100")
 * @param {import('../../../src/types/mapping-types').MappingContext} context - Mapping context with services
 * @returns {boolean} - True if event was handled, false otherwise
 */

import { random } from "lodash-es";
import { colord } from "colord";

const GHOST_STATE = {
  NORMAL: [0x01, 0x03, 0x05, 0x07], // Red, pink, cyan, orange (normal)
  VULNERABLE: 0x11, // Blue (power pill active)
  FLASHING: 0x12, // White (power pill wearing off)
  EATEN: 0x18, // Score display (200/400/800/1600)
  EYES: 0x19, // Eyes returning to ghost home
  CUTSCENE: 0x1d, // Cutscene color (intermissions)
};

const GHOST_COLORS = {
  red: "#FF0000",
  pink: "#FFB8FF",
  cyan: "#00FFFF",
  orange: "#FFB852",
};

// Lookup table for ghost state colors
const GHOST_STATE_COLORS = {
  [GHOST_STATE.VULNERABLE]: "#0000FF",
  [GHOST_STATE.FLASHING]: "#FFFFFF",
  [GHOST_STATE.EATEN]: "#00FFFF",
  [GHOST_STATE.EYES]: "#FFFFFF",
};

export function handle(topic, payload, { broadcast }) {
  const parts = topic.split("/");
  const [, subject, property] = parts;

  if (subject === "player" && property === "score") {
    return broadcast({
      effect: "wipe",
      props: {
        color: "#705014",
        duration: 500,
      },
      drivers: ["rgfx-driver-0001"], // LED Strip
    });
  }

  // Power pill state - blue when active, red when inactive
  if (subject === "player" && property === "pill") {
    const state = parseInt(payload);
    const isActive = state > 0;

    return broadcast({
      effect: "pulse",
      props: {
        color: isActive ? "#0000FF" : "#FF0000",
      },
      drivers: ["rgfx-driver-0002"], // LED Matrix
    });
  }

  // Ghost state changes - color-coded effects
  // Topic format: pacman/ghost/{color}/state
  if (subject === "ghost" && parts.length === 4) {
    const ghostColor = parts[2]; // Get color from correct position
    const state = parseInt(payload);

    // Look up color by state, or use ghost's normal color
    const color =
      GHOST_STATE_COLORS[state] || GHOST_COLORS[ghostColor] || "#FFFFFF";

    return broadcast({
      effect: "pulse",
      drivers: ["rgfx-driver-0002"], // LED Matrix
      props: {
        color,
        duration: 500,
        fade: false,
      },
    });
  }
}
