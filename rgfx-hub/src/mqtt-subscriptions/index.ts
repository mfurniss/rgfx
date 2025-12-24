/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { BrowserWindow } from 'electron';
import type { MqttBroker } from '../network';
import type { DriverRegistry } from '../driver-registry';
import type { DriverPersistence } from '../driver-persistence';
import type { SystemMonitor } from '../system-monitor';
import type { DriverLogPersistence } from '../driver-log-persistence';
import { subscribeDriverTelemetry } from './driver-telemetry';
import { subscribeDriverStatus } from './driver-status';
import { subscribeDriverTestState } from './driver-test-state';
import { subscribeDriverLog } from './driver-log';
import { subscribeDriverWifiResponse } from './driver-wifi-response';

interface MqttSubscriptionsDeps {
  mqtt: MqttBroker;
  driverRegistry: DriverRegistry;
  driverPersistence: DriverPersistence;
  systemMonitor: SystemMonitor;
  driverLogPersistence: DriverLogPersistence;
  getMainWindow: () => BrowserWindow | null;
  getEventsProcessed: () => number;
  getEventTopics: () => Record<string, number>;
}

export function registerMqttSubscriptions(deps: MqttSubscriptionsDeps): void {
  subscribeDriverTelemetry(deps);
  subscribeDriverStatus(deps);
  subscribeDriverTestState(deps);
  subscribeDriverLog(deps);
  subscribeDriverWifiResponse(deps);
}
