import { TelemetryPayloadSchema } from './telemetry-payload';
import { DriverTelemetrySchema } from './driver-telemetry';

/**
 * Driver registration data - fields passed to registerDriver()
 * Combines network info, runtime metrics, and statistics with telemetry
 */
export const DriverRegistrationSchema = TelemetryPayloadSchema.pick({
  ip: true,
  mac: true,
  hostname: true,
  ssid: true,
  rssi: true,
  freeHeap: true,
  minFreeHeap: true,
  uptimeMs: true,
  testActive: true,
  mqttMessagesReceived: true,
  udpMessagesReceived: true,
}).extend({
  telemetry: DriverTelemetrySchema,
});

