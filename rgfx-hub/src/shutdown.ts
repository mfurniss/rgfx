import log from 'electron-log/main';
import type { DriverRegistry } from './driver-registry';
import type { MqttBroker } from './network';

/**
 * Sends clear-effects commands to all connected drivers.
 * Used during app shutdown to turn off LED effects.
 * Waits for all messages to be published before returning.
 */
export async function clearEffectsOnAllDrivers(
  driverRegistry: DriverRegistry,
  mqtt: MqttBroker,
): Promise<void> {
  const connectedDrivers = driverRegistry.getConnectedDrivers();

  const publishPromises = connectedDrivers.map((driver) => {
    const topic = `rgfx/driver/${driver.mac}/clear-effects`;
    log.info(`Sending clear-effects to driver ${driver.id} (${driver.mac})`);

    return mqtt.publish(topic, '');
  });

  await Promise.all(publishPromises);
}
