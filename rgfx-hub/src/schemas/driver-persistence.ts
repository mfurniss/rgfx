/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

/**
 * Panel entry format: "<index><rotation>" where:
 *   - index = panel chain index (0, 1, 2, ...)
 *   - rotation = optional letter: a=0°, b=90°, c=180°, d=270° (default: a if omitted)
 * Examples: "0", "0a", "1b", "10c", "2d"
 */
const PanelEntrySchema = z.string().regex(/^[0-9]+[abcd]?$/, {
  message: 'Panel entry must be "<index>" or "<index><rotation>" (e.g., "0", "1a", "2b")',
});

/**
 * Extract the panel index from a panel entry string
 */
function extractPanelIndex(entry: string): number {
  const match = /^([0-9]+)/.exec(entry);
  return match ? parseInt(match[1], 10) : -1;
}

/**
 * Unified panel layout schema
 * 2D array where each string encodes panel index and rotation.
 * Array structure defines grid: rows = length, cols = first row length.
 * Example: [["0a", "1b"], ["3d", "2c"]] = 2x2 grid with per-panel rotation
 */
export const UnifiedPanelLayoutSchema = z
  .array(z.array(PanelEntrySchema))
  .refine(
    (rows) => {
      if (rows.length === 0) {
        return false;
      }

      const colCount = rows[0].length;

      if (colCount === 0) {
        return false;
      }

      return rows.every((row) => row.length === colCount);
    },
    { message: 'All rows must have the same length and be non-empty' },
  )
  .refine(
    (rows) => {
      const indices = rows.flat().map(extractPanelIndex);
      const expected = Array.from({ length: indices.length }, (_, i) => i);
      const sorted = [...indices].sort((a, b) => a - b);

      return JSON.stringify(sorted) === JSON.stringify(expected);
    },
    { message: 'Panel indices must be sequential from 0 to n-1' },
  );

/**
 * Driver LED configuration schema
 */
const DriverLEDConfigSchema = z.object({
  hardwareRef: z.string(),
  pin: z.number().int().min(0).max(39),
  offset: z.number().int().min(0).nullable().optional(),
  maxBrightness: z.number().int().min(0).max(255).nullable().optional(),
  globalBrightnessLimit: z.number().int().min(0).max(255).nullable().optional(),
  dithering: z.boolean().nullable().optional(),
  powerSupplyVolts: z.number().positive().max(24).nullable().optional(),
  maxPowerMilliamps: z.number().positive().max(10000).nullable().optional(),
  unified: UnifiedPanelLayoutSchema.nullable().optional(),
  // Reverse LED direction for strips (logical index 0 maps to last physical LED)
  reverse: z.boolean().nullable().optional(),
  // Gamma correction per channel (1.0 = linear, 2.8 = typical for WS2812B)
  // Inner fields use .nullable() to accept null from empty form inputs
  gamma: z.object({
    r: z.number().min(1.0).max(5.0).nullable().optional(),
    g: z.number().min(1.0).max(5.0).nullable().optional(),
    b: z.number().min(1.0).max(5.0).nullable().optional(),
  }).nullable().optional(),
  // Floor cutoff per channel (0-255, values at or below floor become 0)
  // Default ensures backwards compatibility with old persisted data
  floor: z.object({
    r: z.number().int().min(0).max(255),
    g: z.number().int().min(0).max(255),
    b: z.number().int().min(0).max(255),
  }).default({ r: 0, g: 0, b: 0 }),
}).strict();

/**
 * Remote logging level for driver-to-hub log forwarding
 */
const RemoteLoggingLevelSchema = z.enum(['all', 'errors', 'off']);
export type RemoteLoggingLevel = z.infer<typeof RemoteLoggingLevelSchema>;

/**
 * Persisted driver schema
 * Stores static configuration and metadata, excludes runtime state
 */
export const PersistedDriverSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-zA-Z0-9-]+$/),
  macAddress: z.string().regex(/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i),
  description: z.string().optional(),
  ledConfig: DriverLEDConfigSchema.nullable().optional(),
  remoteLogging: RemoteLoggingLevelSchema.optional().default('errors'),
  disabled: z.boolean().optional().default(false),
}).strict();

export type PersistedDriverFromSchema = z.infer<typeof PersistedDriverSchema>;

// Input type for forms (before defaults are applied)
export type PersistedDriverInput = z.input<typeof PersistedDriverSchema>;

/**
 * Raw driver configuration file schema (for initial parsing)
 * Uses unknown[] for drivers to allow individual validation with graceful skip
 */
export const DriversConfigFileRawSchema = z.object({
  version: z.string().min(1),
  drivers: z.array(z.unknown()),
});

export interface DriversConfigFile {
  version: string;
  drivers: PersistedDriverFromSchema[];
}
