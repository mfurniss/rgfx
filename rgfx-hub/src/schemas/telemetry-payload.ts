import { z } from 'zod';

/**
 * Telemetry payload schema - validates data from ESP32 drivers
 * Sent via rgfx/system/driver/telemetry MQTT topic
 */
export const TelemetryPayloadSchema = z.object({
  // Network information
  ip: z.string(),
  mac: z.string(),
  hostname: z.string(),
  ssid: z.string(),
  // Runtime metrics
  rssi: z.number(),
  freeHeap: z.number(),
  minFreeHeap: z.number(),
  uptimeMs: z.number(),
  // Hardware telemetry
  chipModel: z.string(),
  chipRevision: z.number(),
  chipCores: z.number(),
  cpuFreqMHz: z.number(),
  flashSize: z.number(),
  flashSpeed: z.number(),
  heapSize: z.number(),
  maxAllocHeap: z.number(),
  psramSize: z.number(),
  freePsram: z.number(),
  firmwareVersion: z.string().optional(),
  sdkVersion: z.string(),
  sketchSize: z.number(),
  freeSketchSpace: z.number(),
  // Runtime state
  testActive: z.boolean().optional(),
  // Statistics
  mqttMessagesReceived: z.number().optional(),
  udpMessagesReceived: z.number().optional(),
  // Crash/reset information
  lastResetReason: z.string().optional(),
  crashCount: z.number().optional(),
  // FPS metrics
  currentFps: z.number(),
  minFps: z.number(),
  maxFps: z.number(),
  // Frame timing metrics (microseconds per frame, averaged)
  frameTiming: z
    .object({
      clearUs: z.number(),
      effectsUs: z.number(),
      downsampleUs: z.number(),
      showUs: z.number(),
      totalUs: z.number(),
    })
    .optional(),
});

