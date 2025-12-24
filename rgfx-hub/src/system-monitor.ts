/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';
import type { SystemStatus } from './types';
import { firmwareVersionService } from './services/firmware-version-service';
import { FirmwareWatcher } from './services/firmware-watcher';
import { getLocalIP } from './network/network-utils';

export class SystemMonitor {
  private readonly hubStartTime: number;
  private readonly firmwareWatcher: FirmwareWatcher;
  private onFirmwareUpdatedCallback?: (version: string | null) => void;

  constructor() {
    this.hubStartTime = Date.now();
    this.firmwareWatcher = new FirmwareWatcher();
    this.setupFirmwareWatcher();
  }

  private setupFirmwareWatcher(): void {
    this.firmwareWatcher.on('firmware-updated', (version: string | null) => {
      log.info('[SystemMonitor] Firmware updated notification received:', version);

      if (this.onFirmwareUpdatedCallback) {
        log.info('[SystemMonitor] Calling firmware updated callback');
        this.onFirmwareUpdatedCallback(version);
      } else {
        log.warn('[SystemMonitor] No firmware updated callback registered');
      }
    });
  }

  startFirmwareMonitoring(onFirmwareUpdated: (version: string | null) => void): void {
    log.info('[SystemMonitor] Starting firmware monitoring with callback');
    this.onFirmwareUpdatedCallback = onFirmwareUpdated;
    this.firmwareWatcher.start();
  }

  stopFirmwareMonitoring(): void {
    log.info('[SystemMonitor] Stopping firmware monitoring');
    this.firmwareWatcher.stop();
  }

  getLocalIpAddress(): string {
    const ip = getLocalIP();
    // getLocalIP returns '127.0.0.1' when no network found
    return ip === '127.0.0.1' ? 'Unknown' : ip;
  }

  // Generate system status object
  getSystemStatus(
    connectedDriverCount: number,
    totalDriverCount: number,
    eventsProcessed: number,
    eventTopics: Record<string, number>,
  ): SystemStatus {
    const hubIp = this.getLocalIpAddress();
    const isNetworkAvailable = hubIp !== 'Unknown';

    return {
      mqttBroker: isNetworkAvailable ? 'running' : 'stopped',
      udpServer: isNetworkAvailable ? 'active' : 'inactive',
      eventReader: 'monitoring',
      driversConnected: connectedDriverCount,
      driversTotal: totalDriverCount,
      hubIp,
      eventsProcessed,
      hubStartTime: this.hubStartTime,
      currentFirmwareVersion: firmwareVersionService.getCurrentVersion() ?? undefined,
      eventTopics,
    };
  }
}
