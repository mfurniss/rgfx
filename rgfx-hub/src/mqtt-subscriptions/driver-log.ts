import log from 'electron-log/main';
import { z } from 'zod';
import type { MqttBroker } from '../network';
import type { DriverLogPersistence } from '../driver-log-persistence';
import { eventBus } from '../services/event-bus';

/**
 * Schema for driver log messages
 * Note: Driver sends uptime in ms (millis()), not real timestamp.
 * Hub uses its own timestamp when persisting logs.
 */
const DriverLogMessageSchema = z.object({
  level: z.enum(['info', 'error']),
  message: z.string(),
  timestamp: z.number(), // Driver uptime in ms (ignored, Hub uses Date.now())
});

interface DriverLogDeps {
  mqtt: MqttBroker;
  driverLogPersistence: DriverLogPersistence;
}

export function subscribeDriverLog(deps: DriverLogDeps): void {
  const { mqtt, driverLogPersistence } = deps;

  mqtt.subscribe('rgfx/driver/+/log', (topic, payload) => {
    const match = /^rgfx\/driver\/(.+)\/log$/.exec(topic);

    if (!match) {
      log.error(`Invalid log topic format: ${topic}`);
      return;
    }

    const driverId = match[1];

    try {
      const parsed: unknown = JSON.parse(payload);
      const result = DriverLogMessageSchema.safeParse(parsed);

      if (!result.success) {
        log.error(
          `Invalid driver log message from ${driverId}: ${result.error.message}`,
        );
        return;
      }

      const { level, message } = result.data;

      // Detect crash recovery and surface as system error
      if (message.includes('CRASH RECOVERY')) {
        log.warn(`Driver ${driverId} recovered from crash: ${message}`);
        eventBus.emit('system:error', {
          errorType: 'driver',
          message: `Driver ${driverId} crash recovery detected`,
          timestamp: Date.now(),
          details: message,
        });
      }

      // Use Hub's timestamp since driver only has uptime (millis())
      driverLogPersistence.appendLog(
        driverId,
        level,
        message,
        Date.now(),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      log.error(`Failed to parse driver log from ${driverId}: ${errorMessage}`);
    }
  });
}
