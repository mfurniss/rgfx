/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { z } from 'zod';

/**
 * Minimal schema for registering old firmware drivers
 *
 * This schema provides backward compatibility for drivers running old firmware
 * that don't send complete telemetry data. It only requires the critical fields
 * needed for driver identity and OTA updates:
 * - IP address (required for OTA upload)
 * - MAC address (required for driver identity)
 *
 * All other fields are optional. When missing, placeholder values will be used
 * to populate the driver registration data.
 *
 * Used as fallback when full TelemetryPayloadSchema validation fails.
 */
export const MinimalDriverRegistrationSchema = z.object({
  // CRITICAL - Required for OTA and identity
  ip: z.string().min(1),
  mac: z.string().regex(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/),

  // Optional - enhances driver info but not required
  hostname: z.string().optional(),
  ssid: z.string().optional(),
  rssi: z.number().optional(),
  freeHeap: z.number().optional(),
  minFreeHeap: z.number().optional(),
  uptimeMs: z.number().optional(),

  // Hardware telemetry - optional
  chipModel: z.string().optional(),
  chipRevision: z.number().optional(),
  chipCores: z.number().optional(),
  cpuFreqMHz: z.number().optional(),
  flashSize: z.number().optional(),
  flashSpeed: z.number().optional(),
  heapSize: z.number().optional(),
  psramSize: z.number().optional(),
  freePsram: z.number().optional(),
  hasDisplay: z.boolean().optional(),
  sdkVersion: z.string().optional(),
  sketchSize: z.number().optional(),
  freeSketchSpace: z.number().optional(),

  // CRITICAL - For "needs update" detection
  firmwareVersion: z.string().optional(),

  // Runtime state
  testActive: z.boolean().optional(),
  mqttMessagesReceived: z.number().optional(),
  udpMessagesReceived: z.number().optional(),
});

export type MinimalDriverRegistration = z.infer<typeof MinimalDriverRegistrationSchema>;
