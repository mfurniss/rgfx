import type { BrowserWindow } from 'electron';
import type { MqttBroker } from '../network';
import type { DriverRegistry } from '../driver-registry';
import type { DriverConfig } from '../driver-config';
import type { SystemMonitor } from '../system-monitor';
import type { DriverLogPersistence } from '../driver-log-persistence';
import { subscribeDriverTelemetry } from './driver-telemetry';
import { subscribeDriverStatus } from './driver-status';
import { subscribeDriverTestState } from './driver-test-state';
import { subscribeDriverLog } from './driver-log';
import { subscribeDriverWifiResponse } from './driver-wifi-response';
import { subscribeDriverError } from './driver-error';

interface MqttSubscriptionsDeps {
  mqtt: MqttBroker;
  driverRegistry: DriverRegistry;
  driverConfig: DriverConfig;
  systemMonitor: SystemMonitor;
  driverLogPersistence: DriverLogPersistence;
  getMainWindow: () => BrowserWindow | null;
}

export function registerMqttSubscriptions(deps: MqttSubscriptionsDeps): void {
  subscribeDriverTelemetry(deps);
  subscribeDriverStatus(deps);
  subscribeDriverTestState(deps);
  subscribeDriverLog(deps);
  subscribeDriverWifiResponse(deps);
  subscribeDriverError(deps);
}
