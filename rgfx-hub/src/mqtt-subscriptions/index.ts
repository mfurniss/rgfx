/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import type { BrowserWindow } from 'electron';
import type { Mqtt } from '../mqtt';
import type { DriverRegistry } from '../driver-registry';
import type { DriverPersistence } from '../driver-persistence';
import type { DiscoveryService } from '../discovery-service';
import type { SystemMonitor } from '../system-monitor';
import { subscribeDriverConnect } from './driver-connect';
import { subscribeDriverHeartbeat } from './driver-heartbeat';
import { subscribeDriverStatus } from './driver-status';
import { subscribeDriverTestState } from './driver-test-state';

interface MqttSubscriptionsDeps {
  mqtt: Mqtt;
  driverRegistry: DriverRegistry;
  driverPersistence: DriverPersistence;
  discoveryService: DiscoveryService;
  systemMonitor: SystemMonitor;
  getMainWindow: () => BrowserWindow | null;
  getEventsProcessed: () => number;
}

export function registerMqttSubscriptions(deps: MqttSubscriptionsDeps): void {
  subscribeDriverConnect(deps);
  subscribeDriverHeartbeat(deps);
  subscribeDriverStatus(deps);
  subscribeDriverTestState(deps);
}
