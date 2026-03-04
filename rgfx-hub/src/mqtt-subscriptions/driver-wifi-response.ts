import log from 'electron-log/main';
import type { MqttBroker } from '../network';
import type { DriverRegistry } from '../driver-registry';
import { eventBus } from '../services/event-bus';
import { getErrorMessage } from '../utils/driver-utils';

interface DriverWifiResponseDeps {
  mqtt: MqttBroker;
  driverRegistry: DriverRegistry;
}

/**
 * Subscribes to WiFi configuration response messages from drivers.
 * When a driver confirms WiFi credentials were saved, marks it as restarting.
 */
export function subscribeDriverWifiResponse(deps: DriverWifiResponseDeps): void {
  const { mqtt, driverRegistry } = deps;

  mqtt.subscribe('rgfx/driver/+/wifi/response', (topic, payload) => {
    log.info(`WiFi response received: ${topic}`);

    const match = /^rgfx\/driver\/(.+)\/wifi\/response$/.exec(topic);

    if (!match) {
      log.error(`Invalid wifi response topic format: ${topic}`);
      return;
    }

    const driverId = match[1];
    const driver = driverRegistry.getDriver(driverId);

    if (!driver) {
      log.warn(`WiFi response from unknown driver: ${driverId}`);
      return;
    }

    try {
      const response = JSON.parse(payload) as { success: boolean; error?: string };

      if (response.success) {
        log.info(`Driver ${driver.id} WiFi credentials saved, driver will restart`);

        // Notify renderer that driver is restarting (suppresses disconnect notification)
        eventBus.emit('driver:restarting', { driver });

        // Mark driver as disconnected
        driver.state = 'disconnected';
        driver.ip = undefined;
        eventBus.emit('driver:disconnected', { driver, reason: 'restarting' });
      } else {
        log.error(`Driver ${driver.id} failed to save WiFi credentials: ${response.error}`);
      }
    } catch (err) {
      log.error(`Failed to parse WiFi response from ${driverId}: ${getErrorMessage(err)}`);
    }
  });
}
