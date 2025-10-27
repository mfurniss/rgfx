/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from "electron-log/main";
import type { Mqtt } from "./mqtt";

// Discovery interval (30 seconds between pings)
const DISCOVERY_INTERVAL_MS = 30000;

// Timeout check interval (check every 5 seconds)
const TIMEOUT_CHECK_INTERVAL_MS = 5000;

export class DiscoveryService {
  private mqtt: Mqtt;
  private discoveryInterval?: NodeJS.Timeout;
  private timeoutCheckInterval?: NodeJS.Timeout;
  private onTimeoutCheckCallback?: () => void;

  constructor(mqtt: Mqtt) {
    this.mqtt = mqtt;
  }

  // Set callback for periodic timeout checks
  onTimeoutCheck(callback: () => void) {
    this.onTimeoutCheckCallback = callback;
  }

  // Start periodic driver discovery
  start() {
    // Send discovery request immediately on startup
    this.sendDiscoveryRequest();

    // Then send every 30 seconds
    this.discoveryInterval = setInterval(() => {
      this.sendDiscoveryRequest();
    }, DISCOVERY_INTERVAL_MS);

    // Check for timed-out devices every 5 seconds
    this.timeoutCheckInterval = setInterval(() => {
      this.onTimeoutCheckCallback?.();
    }, TIMEOUT_CHECK_INTERVAL_MS);

    log.info("Discovery service started");
  }

  // Stop discovery service
  stop() {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = undefined;
    }
    if (this.timeoutCheckInterval) {
      clearInterval(this.timeoutCheckInterval);
      this.timeoutCheckInterval = undefined;
    }
    log.info("Discovery service stopped");
  }

  // Send discovery request to find drivers
  private sendDiscoveryRequest() {
    log.info("Sending driver discovery request...");
    this.mqtt.publish("rgfx/system/discover", "ping");
  }

  // Trigger immediate discovery (e.g., after UDP failure)
  triggerImmediateDiscovery() {
    log.info("Triggering immediate discovery request");
    this.sendDiscoveryRequest();
  }
}
