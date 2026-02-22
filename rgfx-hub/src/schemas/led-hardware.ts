import { z } from 'zod';

/**
 * LED Hardware schema - validates LED hardware definition files
 * Stored in led-hardware/ directory
 */
export const LEDHardwareSchema = z.object({
  description: z.string().optional(),
  sku: z.string().nullable(),
  asin: z.string().nullable().optional(),
  layout: z.string(),
  count: z.number().positive(),
  chipset: z.string().optional(),
  colorOrder: z.string().optional(),
  colorCorrection: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

