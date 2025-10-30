/**
 * Mapper Installer
 *
 * Manages installation of default mappers to user data directory.
 * Default mappers are shipped with the app and copied to user directory on first run.
 */

import { app } from 'electron';
import { promises as fs } from 'node:fs';
import { join, dirname } from 'node:path';
import log from 'electron-log/main';

/**
 * Default mapper file contents as embedded strings.
 * These are shipped with the app and copied to user directory on first run.
 */
const DEFAULT_MAPPERS = {
  'default.js': `// Default catch-all handler
export function handle(_topic, _payload, { broadcast, log }) {
  log.debug(\`Unmatched event: \${_topic} = \${_payload}\`);

  return broadcast({
    effect: 'pulse',
    props: { color: '#FFFFFF' },
  });
}
`,
  'games/galaga.js': `// Galaga mapper - see pacman.js for format example
export function handle(topic, _payload, { broadcast }) {
  const [, subject, property] = topic.split("/");

  if (subject === "player" && property === "score") {
    return broadcast({
      effect: "pulse",
      props: { color: "#FFFF00" },
    });
  }

  // Player fired missile - green pulse
  if (subject === "player" && property === "fired") {
    return broadcast({
      effect: "pulse",
      props: { color: "#00FF00" },
    });
  }
}
`,
  'games/pacman.js': `/**
 * Pac-Man game-specific mapper
 *
 * Handles Pac-Man/Ms. Pac-Man specific events:
 * - pacman/player/score/p1 - Player score (yellow pulse, intensity based on score)
 * - pacman/player/pill/state - Power pill state (blue when active, red when inactive)
 * - pacman/ghost/{color}/state - Individual ghost states with color-coded effects
 *
 * @param {string} topic - Event topic (e.g., "pacman/player/score/p1")
 * @param {string} payload - Event payload (e.g., "100")
 * @param {import('../../../src/types/mapping-types').MappingContext} context - Mapping context with services
 * @returns {boolean} - True if event was handled, false otherwise
 */

const GHOST_STATE = {
  NORMAL: [0x01, 0x03, 0x05, 0x07], // Red, pink, cyan, orange (normal)
  VULNERABLE: 0x11, // Blue (power pill active)
  FLASHING: 0x12, // White (power pill wearing off)
  EATEN: 0x18, // Score display (200/400/800/1600)
  EYES: 0x19, // Eyes returning to ghost home
  CUTSCENE: 0x1d, // Cutscene color (intermissions)
};

const GHOST_COLORS = {
  red: '#FF0000',
  pink: '#FFB8FF',
  cyan: '#00FFFF',
  orange: '#FFB852',
};

// Lookup table for ghost state colors
const GHOST_STATE_COLORS = {
  [GHOST_STATE.VULNERABLE]: '#0000FF',
  [GHOST_STATE.FLASHING]: '#FFFFFF',
  [GHOST_STATE.EATEN]: '#FFFFFF',
  [GHOST_STATE.EYES]: '#FFFFFF',
};

export function handle(topic, payload, { broadcast }) {
  const [, subject, property] = topic.split('/');

  // Player score - yellow pulse
  if (subject === 'player' && property === 'score') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FFFF00', // Yellow
      },
    });
  }

  // Power pill state - blue when active, red when inactive
  if (subject === 'player' && property === 'pill') {
    const state = parseInt(payload);
    const isActive = state > 0;

    return broadcast({
      effect: 'pulse',
      props: {
        color: isActive ? '#0000FF' : '#FF0000',
      },
    });
  }

  // Ghost state changes - color-coded effects
  if (subject === 'ghost' && property) {
    const ghostColor = property;
    const state = parseInt(payload);

    // Look up color by state, or use ghost's normal color
    const color = GHOST_STATE_COLORS[state] || GHOST_COLORS[ghostColor] || '#FFFFFF';

    return broadcast({
      effect: 'pulse',
      props: {
        color,
      },
    });
  }
}
`,
  'games/smb.js': `/**
 * Super Mario Bros game-specific mapper
 *
 * Handles Super Mario Bros specific events:
 * - smb/player/score - Player score (red pulse for Mario theme)
 * - smb/player/coins - Coin collection (yellow flash)
 * - smb/player/powerup - Power-up state (mushroom, fire flower, star)
 * - smb/player/death - Player death (red fade)
 * - smb/enemy/defeated - Enemy defeated (white sparkle)
 *
 * Note: This is a placeholder mapper. Actual memory addresses need to be
 * determined by analyzing the NES ROM and creating an interceptor.
 *
 * @param {string} topic
 * @param {string} payload
 * @param {import('../../../src/types/mapping-types').MappingContext} context
 * @returns {boolean}
 */
export function handle(topic, payload, { broadcast }) {
  const [, subject, property] = topic.split('/');

  // Player score - red pulse (Mario's signature color)
  if (subject === 'player' && property === 'score') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FF0000', // Mario red
      },
    });
  }

  // Coin collection - yellow pulse
  if (subject === 'player' && property === 'coins') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FFD700', // Gold
      },
    });
  }

  // Power-up state change
  if (subject === 'player' && property === 'powerup') {
    const powerup = payload; // 'small', 'super', 'fire', 'star'
    let color = '#FFFFFF';

    switch (powerup) {
      case 'mushroom':
      case 'super':
        color = '#FF0000'; // Red mushroom
        break;
      case 'fire':
        color = '#FFA500'; // Orange fire flower
        break;
      case 'star':
        color = '#FFFF00'; // Yellow star
        break;
    }

    return broadcast({
      effect: 'pulse',
      props: {
        color,
      },
    });
  }

  // Player death - red pulse
  if (subject === 'player' && property === 'death') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FF0000',
      },
    });
  }

  // Enemy defeated - white pulse
  if (subject === 'enemy' && property === 'defeated') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FFFFFF',
      },
    });
  }
}
`,
  'patterns/score.js': `/**
 * Score pattern mapper
 *
 * Matches any topic containing "/score" anywhere in the path.
 * Provides a generic green pulse.
 *
 * @param {string} topic
 * @param {string} payload
 * @param {import('../../../src/types/mapping-types').MappingContext} context
 * @returns {boolean}
 */
export function handle(topic, _payload, { broadcast }) {
  // Match any topic with "score" anywhere
  if (!topic.includes('/score')) return false;

  return broadcast({
    effect: 'pulse',
    props: {
      color: '#00FF00',
    },
  });
}
`,
  'subjects/enemy.js': `/**
 * Enemy subject mapper
 *
 * Handles generic enemy events across all games:
 * - enemy/destroyed - Enemy killed/destroyed
 * - enemy/spawned - Enemy spawned
 *
 * @param {string} topic
 * @param {string} payload
 * @param {import('../../../src/types/mapping-types').MappingContext} context
 * @returns {boolean}
 */
export function handle(topic, _payload, { broadcast }) {
  const [, subject, property] = topic.split('/');

  if (subject !== 'enemy') return false;

  // Enemy destroyed/killed
  if (property === 'destroyed' || property === 'killed') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FFFFFF',
      },
    });
  }

  // Enemy spawned
  if (property === 'spawned') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FF8800',
      },
    });
  }
}
`,
  'subjects/ghost.js': `/**
 * Ghost subject mapper
 *
 * Handles generic ghost events (primarily for Pac-Man-style games):
 * - ghost/state - Ghost state changes
 *
 * @param {string} topic
 * @param {string} payload
 * @param {import('../../../src/types/mapping-types').MappingContext} context
 * @returns {boolean}
 */
export function handle(topic, _payload, { broadcast }) {
  const [, subject, property] = topic.split('/');

  if (subject !== 'ghost') return false;

  // Generic ghost state change
  if (property === 'state') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FFFFFF',
      },
    });
  }
}
`,
  'subjects/player.js': `// Generic player events
export function handle(topic, _payload, { broadcast }) {
  const [, subject, property] = topic.split('/');
  if (subject !== 'player') return false;

  if (property === 'score') {
    return broadcast({
      effect: 'pulse',
      props: { color: '#00FF00' },
    });
  }
}
`,
};

/**
 * Get the user data directory for mappers
 */
export function getMappingsDir(): string {
  return join(app.getPath('userData'), 'mappings');
}

/**
 * Install default mappers to user data directory if they don't exist
 */
export async function installDefaultMappers(): Promise<void> {
  const mappingsDir = getMappingsDir();

  try {
    // Create directories
    await fs.mkdir(join(mappingsDir, 'games'), { recursive: true });
    await fs.mkdir(join(mappingsDir, 'subjects'), { recursive: true });
    await fs.mkdir(join(mappingsDir, 'patterns'), { recursive: true });

    // Write default mapper files if they don't exist
    for (const [relativePath, content] of Object.entries(DEFAULT_MAPPERS)) {
      const filePath = join(mappingsDir, relativePath);

      try {
        await fs.access(filePath);
        // File exists, don't overwrite user customizations
        log.info(`Mapper already exists: ${relativePath}`);
      } catch {
        // File doesn't exist, create it
        await fs.mkdir(dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
        log.info(`Installed default mapper: ${relativePath}`);
      }
    }

    log.info(`Default mappers installed to: ${mappingsDir}`);
  } catch (error) {
    log.error('Failed to install default mappers:', error);
    throw error;
  }
}
