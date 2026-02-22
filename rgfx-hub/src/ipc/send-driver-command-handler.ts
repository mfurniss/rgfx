import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { DriverRegistry } from '../driver-registry';
import type { MqttBroker } from '../network';
import { requireDriverWithMac, buildDriverTopic } from '../utils/driver-utils';
import { INVOKE_CHANNELS } from './contract';

interface SendDriverCommandHandlerDeps {
  driverRegistry: DriverRegistry;
  mqtt: MqttBroker;
}

export function registerSendDriverCommandHandler(deps: SendDriverCommandHandlerDeps): void {
  const { driverRegistry, mqtt } = deps;

  ipcMain.handle(
    INVOKE_CHANNELS.sendDriverCommand,
    async (_event, driverId: string, command: string, payload?: string) => {
      log.info(`Command '${command}' requested for driver ${driverId}${payload ? ` with payload: ${payload}` : ''}`);

      const driver = requireDriverWithMac(driverId, driverRegistry);
      const topic = buildDriverTopic(driver.mac, command);

      if (payload !== undefined) {
        await mqtt.publish(topic, payload);
      } else {
        await mqtt.publish(topic, '');
      }

      log.info(`Command '${command}' sent to driver ${driverId} (${driver.mac})`);
    },
  );
}
