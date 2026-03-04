import log from 'electron-log/main';
import type { DriverConfig } from '../driver-config';
import type { MqttBroker } from '../network';
import type { Driver } from '../types';

interface DriverConnectServiceDeps {
  driverConfig: DriverConfig;
  mqtt: MqttBroker;
  uploadConfigToDriver: (macAddress: string) => Promise<boolean>;
}

/**
 * Handles post-connection setup for a driver:
 * uploads config and syncs remote logging level.
 */
export function createDriverConnectService(deps: DriverConnectServiceDeps) {
  const { driverConfig, mqtt, uploadConfigToDriver } = deps;

  return {
    onDriverConnected(driver: Driver): void {
      if (!driver.mac) {
        log.warn(
          `Driver ${driver.id} connected without MAC address`
          + ' - cannot upload config',
        );
        return;
      }

      void uploadConfigToDriver(driver.mac).catch((error: unknown) => {
        log.error(
          `Failed to upload config to driver ${driver.id}:`,
          error,
        );
      });

      const configuredDriver = driverConfig.getDriver(driver.id);
      const remoteLogging = configuredDriver?.remoteLogging ?? 'off';
      const loggingTopic = `rgfx/driver/${driver.mac}/logging`;
      const loggingPayload = JSON.stringify({ level: remoteLogging });

      void mqtt.publish(loggingTopic, loggingPayload).then(() => {
        log.info(
          `Sent remote logging config to driver ${driver.id}:`
          + ` ${remoteLogging}`,
        );
      }).catch((error: unknown) => {
        log.error(
          `Failed to send logging config to driver ${driver.id}:`,
          error,
        );
      });
    },
  };
}

export type DriverConnectService = ReturnType<
  typeof createDriverConnectService
>;
