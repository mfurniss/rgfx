/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';
import { eventBus } from '../services/event-bus';
import { getLocalIP } from './network-utils';
import { DISCOVERY_RESTART_DEBOUNCE_MS, IP_CHECK_INTERVAL_MS } from '../config/constants';

/** Interface for MQTT broker methods needed by NetworkManager */
export interface DiscoveryController {
  stopDiscovery(): void;
  restartDiscovery(newIP: string): void;
}

/**
 * Central coordinator for network state management.
 * Listens for network errors and orchestrates recovery.
 * Monitors for IP address changes to detect network switches.
 */
export class NetworkManager {
  private mqtt: DiscoveryController;
  private debounceTimer?: NodeJS.Timeout;
  private ipCheckInterval?: NodeJS.Timeout;
  private currentIP: string;

  constructor(mqtt: DiscoveryController) {
    this.mqtt = mqtt;
    this.currentIP = getLocalIP();
    this.setupEventListeners();
    this.startIPMonitoring();
  }

  private setupEventListeners(): void {
    eventBus.on('network:error', ({ code }) => {
      if (code === 'ENETUNREACH') {
        this.handleNetworkUnreachable();
      }
    });
  }

  private startIPMonitoring(): void {
    this.ipCheckInterval = setInterval(() => {
      this.checkForIPChange();
    }, IP_CHECK_INTERVAL_MS);
  }

  private checkForIPChange(): void {
    // Skip if we're already handling a network issue
    if (this.debounceTimer) {
      return;
    }

    const newIP = getLocalIP();

    if (newIP !== this.currentIP) {
      log.info(`IP address changed: ${this.currentIP} -> ${newIP}`);
      this.currentIP = newIP;

      if (newIP === '127.0.0.1') {
        // Network went down - handle like ENETUNREACH
        this.handleNetworkUnreachable();
      } else {
        // Network changed to a different IP - restart discovery
        log.info(`Network changed, restarting discovery with IP: ${newIP}`);
        this.mqtt.stopDiscovery();
        this.mqtt.restartDiscovery(newIP);
        eventBus.emit('network:changed', undefined);
      }
    }
  }

  private handleNetworkUnreachable(): void {
    if (this.debounceTimer) {
      return;
    }

    // Stop discovery immediately to prevent stale broadcasts
    this.mqtt.stopDiscovery();
    eventBus.emit('network:changed', undefined);

    log.info(
      `Network unreachable, discovery stopped. Will check for recovery in ${DISCOVERY_RESTART_DEBOUNCE_MS / 1000}s`,
    );

    this.scheduleRecoveryCheck();
  }

  private scheduleRecoveryCheck(): void {
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = undefined;
      const newIP = getLocalIP();

      if (newIP === '127.0.0.1') {
        log.info('Network still unavailable, will retry...');
        this.scheduleRecoveryCheck();
        return;
      }

      this.currentIP = newIP;
      log.info(`Network recovered, restarting discovery with IP: ${newIP}`);
      this.mqtt.restartDiscovery(newIP);
      eventBus.emit('network:changed', undefined);
    }, DISCOVERY_RESTART_DEBOUNCE_MS);
  }

  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    if (this.ipCheckInterval) {
      clearInterval(this.ipCheckInterval);
      this.ipCheckInterval = undefined;
    }
  }
}
