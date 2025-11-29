/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

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
});

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
});

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
