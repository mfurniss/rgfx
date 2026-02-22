import log from 'electron-log/main';
import type { MqttBroker } from '../network';
import type { DriverRegistry } from '../driver-registry';

import { sendToRenderer } from '../utils/driver-utils';
import { IPC } from '../config/ipc-channels';

interface DriverTestStateDeps {
  mqtt: MqttBroker;
  driverRegistry: DriverRegistry;
  getMainWindow: () => Electron.BrowserWindow | null;
}

export function subscribeDriverTestState(deps: DriverTestStateDeps): void {
  const { mqtt, driverRegistry, getMainWindow } = deps;

  mqtt.subscribe('rgfx/driver/+/test/state', (topic, payload) => {
    log.info(`Test state change: ${topic} = ${payload}`);

    const match = /^rgfx\/driver\/(.+)\/test\/state$/.exec(topic);

    if (!match) {
      log.error(`Invalid test state topic format: ${topic}`);
      return;
    }

    const driverId = match[1];
    const driver = driverRegistry.getDriver(driverId);

    if (!driver) {
      log.warn(`Test state change from unknown driver: ${driverId}`);
      return;
    }

    driver.testActive = payload === 'on';

    log.info(`Sending driver:updated to renderer for ${driver.id}`);
    sendToRenderer(getMainWindow, IPC.DRIVER_UPDATED, driver);
  });
}
