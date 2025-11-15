/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';
import type { Mqtt } from './mqtt';
import { DISCOVERY_INTERVAL_MS, MQTT_TOPIC_DISCOVERY } from './config/constants';

export class DiscoveryService {
  private mqtt: Mqtt;
  private discoveryInterval?: NodeJS.Timeout;
  private respondedDrivers = new Set<string>();
  private onHeartbeatCycleCompleteCallback?: (respondedDriverIds: Set<string>) => void;

  constructor(mqtt: Mqtt) {
    this.mqtt = mqtt;
  }

  // Set callback for when heartbeat cycle completes
  onHeartbeatCycleComplete(callback: (respondedDriverIds: Set<string>) => void) {
    this.onHeartbeatCycleCompleteCallback = callback;
  }

  // Track a driver heartbeat response
  trackHeartbeatResponse(driverId: string) {
    this.respondedDrivers.add(driverId);
    log.debug(`Tracked heartbeat response from driver ${driverId}`);
  }

  // Start periodic driver discovery
  start() {
    // Send discovery request immediately on startup
    this.sendDiscoveryRequest();

    // Then send every 10 seconds
    this.discoveryInterval = setInterval(() => {
      this.sendDiscoveryRequest();
    }, DISCOVERY_INTERVAL_MS);

    log.info('Discovery service started');
  }

  // Stop discovery service
  stop() {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = undefined;
    }
    log.info('Discovery service stopped');
  }

  // Send discovery request to find drivers
  private sendDiscoveryRequest() {
    // Process the previous cycle's responses before starting a new cycle
    if (this.respondedDrivers.size > 0 || this.onHeartbeatCycleCompleteCallback) {
      log.info(`Processing heartbeat cycle: ${this.respondedDrivers.size} drivers responded`);
      this.onHeartbeatCycleCompleteCallback?.(this.respondedDrivers);

      // Clear for next cycle
      this.respondedDrivers.clear();
    }

    log.info('Sending driver discovery request...');
    void this.mqtt.publish(MQTT_TOPIC_DISCOVERY, 'ping').catch((error: unknown) => {
      log.error('Failed to send discovery request:', error);
    });
  }

  // Trigger immediate discovery (e.g., after UDP failure)
  triggerImmediateDiscovery() {
    log.info('Triggering immediate discovery request');
    this.sendDiscoveryRequest();
  }
}
