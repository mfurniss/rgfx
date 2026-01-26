/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';
import type { SystemError, SystemStatus } from './types';
import { firmwareVersionService } from './services/firmware-version-service';
import { FirmwareWatcher } from './services/firmware-watcher';
import { getLocalIP } from './network/network-utils';

interface UdpStats {
  sent: number;
  failed: number;
}

export class SystemMonitor {
  private readonly hubStartTime: number;
  private readonly firmwareWatcher: FirmwareWatcher;
  private onFirmwareUpdatedCallback?: (version: string | null) => void;
  private udpStatsByDriver = new Map<string, UdpStats>();

  constructor() {
    this.hubStartTime = Date.now();
    this.firmwareWatcher = new FirmwareWatcher();
    this.setupFirmwareWatcher();
  }

  trackUdpSent(driverId: string, success: boolean): void {
    const stats = this.udpStatsByDriver.get(driverId) ?? { sent: 0, failed: 0 };

    if (success) {
      stats.sent++;
    } else {
      stats.failed++;
    }
    this.udpStatsByDriver.set(driverId, stats);
  }

  getUdpStatsByDriver(): Map<string, UdpStats> {
    return this.udpStatsByDriver;
  }

  getUdpStatsForDriver(driverId: string): UdpStats {
    return this.udpStatsByDriver.get(driverId) ?? { sent: 0, failed: 0 };
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

  async getLocalIpAddress(): Promise<string> {
    const ip = await getLocalIP();
    // getLocalIP returns '127.0.0.1' when no network found
    return ip === '127.0.0.1' ? 'Unknown' : ip;
  }

  // Generate system status object
  async getSystemStatus(
    connectedDriverCount: number,
    totalDriverCount: number,
    eventsProcessed: number,
    eventLogSizeBytes: number,
    errors: readonly SystemError[] = [],
  ): Promise<SystemStatus> {
    const hubIp = await this.getLocalIpAddress();
    const isNetworkAvailable = hubIp !== 'Unknown';

    // Aggregate UDP stats from all drivers
    let udpMessagesSent = 0;
    let udpMessagesFailed = 0;

    for (const stats of this.udpStatsByDriver.values()) {
      udpMessagesSent += stats.sent;
      udpMessagesFailed += stats.failed;
    }

    return {
      mqttBroker: isNetworkAvailable ? 'running' : 'stopped',
      udpServer: isNetworkAvailable ? 'active' : 'inactive',
      eventReader: 'monitoring',
      driversConnected: connectedDriverCount,
      driversTotal: totalDriverCount,
      hubIp,
      eventsProcessed,
      eventLogSizeBytes,
      hubStartTime: this.hubStartTime,
      firmwareVersions: firmwareVersionService.getVersions(),
      udpMessagesSent,
      udpMessagesFailed,
      udpStatsByDriver: Object.fromEntries(this.udpStatsByDriver),
      systemErrors: errors,
    };
  }
}
