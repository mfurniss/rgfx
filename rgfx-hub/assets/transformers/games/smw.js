import { duration } from '@mui/material';

/**
 * Super Mario Bros game-specific mapper
 *
 * Handles Super Mario Bros specific events from nes_smb_rgfx.lua interceptor:
 * - smb/player/score - Player score (red pulse for Mario theme)
 * - smb/player/coins - Coin collection (yellow flash)
 * - smb/player/jump - Player jump (red pulse)
 * - smb/player/fireball - Fireball shot (orange pulse for fire flower)
 * - smb/game/music/area - Music track changes (different colors per area)
 * - smb/game/music/event - Event music (death, game over, level ending, etc.)
 *
 * @param {import('../../../src/types/mapping-types').RgfxTopic} topic - Parsed topic with pre-split segments
 * @param {string} payload
 * @param {import('../../../src/types/mapping-types').MappingContext} context
 * @returns {boolean}
 */
export function transform({ subject, property, qualifier, payload }, { broadcast }) {
  // Player score - red pulse (Mario's signature color)
  if (subject === 'player' && property === 'score') {
    return broadcast({
      effect: 'wipe',
    });
  }

  // Coin collection - yellow/gold pulse
  if (subject === 'player' && property === 'coins') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FFD700',
      },
    });
  }

  // Jump
  if (subject === 'player' && property === 'jump') {
    return broadcast({
      effect: 'pulse',
      props: {
        color: '#FF0000',
      },
    });
  }

  // Fireball shot - orange pulse (fire flower theme)
  if (subject === 'player' && property === 'fireball') {
    return broadcast({
      effect: 'wipe',
      props: {
        color: '#FF8000',
        duration: 700,
      },
    });
  }

  // Music track changes - different colors per area
  if (subject === 'game' && property === 'music') {
    const musicType = qualifier; // 'area' or 'event'

    if (musicType === 'area') {
      // Area music: 0x01 = Overworld, 0x02 = Underwater, 0x04 = Underground, 0x08 = Castle, 0x10 = Star
      const track = parseInt(payload, 10);
      let color = '#0000FF'; // Default blue

      switch (track) {
        case 0x01: // Overworld
        case 0x20: // Overworld (transition)
          color = '#00FF00'; // Green (grass)
          break;
        case 0x02: // Underwater
          color = '#0000FF'; // Blue
          break;
        case 0x04: // Underground
          color = '#A52A2A'; // Brown
          break;
        case 0x08: // Castle
          color = '#808080'; // Gray
          break;
        case 0x10: // Star power
          color = '#FFFF00'; // Yellow
          break;
      }

      return broadcast({
        effect: 'pulse',
        props: { color },
      });
    }

    if (musicType === 'event') {
      // Event music: 0x01 = Death, 0x02 = Game over, 0x04 = Ending, 0x08 = Castle ending, 0x20 = Level ending
      const event = parseInt(payload, 10);
      let color = '#FFFFFF'; // Default white

      switch (event) {
        case 0x01: // Death
          color = '#FF0000'; // Red
          break;
        case 0x02: // Game over
          color = '#000000'; // Black (off)
          break;
        case 0x04: // Ending theme
        case 0x08: // Castle ending
        case 0x20: // Level ending
          color = '#00FF00'; // Green (success)
          break;
        case 0x40: // Hurry up jingle
          color = '#FFA500'; // Orange (warning)
          break;
      }

      return broadcast({
        effect: 'pulse',
        props: { color, duration: 5000 },
      });
    }
  }

  // Let other handlers try if we don't match
  return false;
}
