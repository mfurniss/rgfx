import { z } from 'zod';

// Named colors supported by FastLED (case-insensitive on ESP32)
const colorNameSchema = z.enum([
  'random',
  'red',
  'green',
  'blue',
  'white',
  'black',
  'yellow',
  'cyan',
  'magenta',
  'orange',
  'purple',
  'pink',
  'lime',
  'aqua',
  'navy',
  'teal',
  'olive',
  'maroon',
  'silver',
  'gray',
  'grey',
]);

// Hex color string (with or without # prefix)
const hexColorSchema = z.string().regex(/^#?[0-9a-fA-F]{6}$/, 'Invalid hex color format');

// Color can be a named color, hex string, or numeric RGB value
const colorSchema = z.union([
  colorNameSchema,
  hexColorSchema,
  z.number().int().min(0).max(0xffffff),
]);

export default colorSchema.optional().default('random').describe('Named color, hex value, or random');
