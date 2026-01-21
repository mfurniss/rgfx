/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { TelemetryPayloadSchema } from './telemetry-payload';

/**
 * Driver telemetry subset - hardware/firmware information only
 * This is the subset stored in Driver.telemetry
 */
export const DriverTelemetrySchema = TelemetryPayloadSchema.pick({
  chipModel: true,
  chipRevision: true,
  chipCores: true,
  cpuFreqMHz: true,
  flashSize: true,
  flashSpeed: true,
  heapSize: true,
  maxAllocHeap: true,
  psramSize: true,
  freePsram: true,
  firmwareVersion: true,
  sdkVersion: true,
  sketchSize: true,
  freeSketchSpace: true,
  lastResetReason: true,
  crashCount: true,
  currentFps: true,
  minFps: true,
  maxFps: true,
  frameTiming: true,
});

