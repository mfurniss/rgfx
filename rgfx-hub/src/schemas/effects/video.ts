import { z } from 'zod';
import type { FieldTypeMap } from '@/renderer/utils/zod-introspection';
import type { LayoutConfig } from './index';

export const fieldTypes: FieldTypeMap = {
  file: 'videoFile',
};

export const layoutConfig: LayoutConfig = [
  ['file'], [],
  ['loop'], [],
];

/**
 * Video effect props schema.
 *
 * The hub intercepts this effect and delegates to VideoPlayer
 * instead of sending JSON to the ESP32. The schema drives
 * the FX Playground form.
 */
export default z
  .object({
    name: z.literal('Video'),
    description: z.literal('Stream a video file to LED matrix'),
    file: z.string().min(1, 'Select a video file').default('').describe('Path to video file'),
    loop: z.boolean().default(false).describe('Loop playback'),
  })
  .strict();
