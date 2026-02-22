import { z } from 'zod';
import color from './color';

/**
 * Base effect schema with properties common to all effects
 * All effect schemas should extend this using .extend()
 */
export default z.object({
  color,
  reset: z.boolean().optional().default(false).describe('Clear LEDs before running the effect'),
});
