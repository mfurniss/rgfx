import { z } from 'zod';
import { baseEffect, easing } from './properties';
import defaults from './defaults.json';

const d = defaults.pulse;

export function randomize(): Record<string, unknown> {
  return {};
}

/**
 * Pulse effect props schema
 * Creates a full-screen color pulse that fades out over time
 */
export default baseEffect
  .extend({
    name: z.literal('Pulse'),
    description: z.literal('Full-screen color pulse that fades out'),
    duration: z.number().positive().optional().default(d.duration)
      .describe('Effect duration in milliseconds'),
    easing: easing.optional().default(d.easing as 'quinticOut'),
    fade: z.boolean().optional().default(d.fade)
      .describe('Fade out the effect over time'),
    collapse: z.enum(['horizontal', 'vertical', 'none', 'random']).optional()
      .default(d.collapse as 'random')
      .describe('Direction the pulse collapses'),
  })
  .strict();
