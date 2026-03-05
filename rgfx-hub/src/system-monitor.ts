import log from 'electron-log/main';
import type { SystemError, SystemStatus } from './types';
import { firmwareVersionService } from './services/firmware-version-service';
import { FirmwareWatcher } from './services/firmware-watcher';
import { getLocalIP } from './network/network-utils';
import type { MqttBroker } from './network/mqtt-broker';

interface UdpStats {
  sent: number;
  failed: number;
}

interface StatusSources {
  getConnectedCount: () => number;
  getTotalCount: () => number;
  getEventsProcessed: () => number;
  getEventLogSizeBytes: () => number;
  getErrors: () => readonly SystemError[];
}

export class SystemMonitor {
  private readonly hubStartTime: number;
  private readonly firmwareWatcher: FirmwareWatcher;
  private readonly mqtt: MqttBroker;
  private onFirmwareUpdatedCallback?: (version: string | null) => void;
  private udpStatsByDriver = new Map<string, UdpStats>();
  private statusSources?: StatusSources;

  constructor(mqtt: MqttBroker) {
    this.mqtt = mqtt;
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

  clearUdpStats(driverId: string): void {
    this.udpStatsByDriver.delete(driverId);
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

  registerStatusSources(sources: StatusSources): void {
    this.statusSources = sources;
  }

  /**
   * Build full system status using registered sources.
   * Call registerStatusSources() during app init before using this.
   */
  getFullStatus(): SystemStatus {
    if (!this.statusSources) {
      throw new Error('Status sources not registered');
    }
    const s = this.statusSources;
    return this.getSystemStatus(
      s.getConnectedCount(),
      s.getTotalCount(),
      s.getEventsProcessed(),
      s.getEventLogSizeBytes(),
      s.getErrors(),
    );
  }

  // Generate system status object
  getSystemStatus(
    connectedDriverCount: number,
    totalDriverCount: number,
    eventsProcessed: number,
    eventLogSizeBytes: number,
    errors: readonly SystemError[] = [],
  ): SystemStatus {
    const hubIp = getLocalIP();

    // Aggregate UDP stats from all drivers
    let udpMessagesSent = 0;
    let udpMessagesFailed = 0;

    for (const stats of this.udpStatsByDriver.values()) {
      udpMessagesSent += stats.sent;
      udpMessagesFailed += stats.failed;
    }

    return {
      mqttBroker: this.mqtt.isRunning ? 'running' : 'stopped',
      discovery: this.mqtt.isDiscoveryActive ? 'active' : 'inactive',
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
