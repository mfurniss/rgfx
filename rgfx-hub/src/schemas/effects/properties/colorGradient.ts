import { z } from 'zod';

export default z
  .object({
    colors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)).min(2).max(20),
    speed: z.number().min(0.1).max(20).default(3),
    scale: z.number().min(0.1).max(10).default(1),
  })
  .optional()
  .describe('fieldType:gradientPreset|Optional gradient color animation');
