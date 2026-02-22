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

