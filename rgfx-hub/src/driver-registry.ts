/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';
import { createDriver, type Driver, type DriverTelemetry, type LEDHardware } from './types';
import type { DriverPersistence, PersistedDriver } from './driver-persistence';
import type { LEDHardwareManager } from './led-hardware-manager';
import { eventBus } from './services/event-bus';
import {
  DRIVER_CONNECTION_TIMEOUT_MS,
  DRIVER_CONNECTION_CHECK_INTERVAL_MS,
} from './config/constants';

export class DriverRegistry {
  private drivers = new Map<string, Driver>();
  private persistence?: DriverPersistence;
  private connectionMonitorInterval?: NodeJS.Timeout;

  constructor(persistence?: DriverPersistence, ledHardwareManager?: LEDHardwareManager) {
    this.persistence = persistence;

    // Load all known drivers from persistence (all start as disconnected)
    if (persistence && ledHardwareManager) {
      const persistedDrivers = persistence.getAllDrivers();

      for (const pd of persistedDrivers) {
        // Resolve LED hardware if config exists
        let resolvedHardware: LEDHardware | undefined = undefined;

        if (pd.ledConfig?.hardwareRef) {
          const hardware = ledHardwareManager.loadHardware(pd.ledConfig.hardwareRef);

          if (hardware) {
            resolvedHardware = hardware;
          } else {
            log.warn(
              `Failed to resolve LED hardware for driver ${pd.id}: ${pd.ledConfig.hardwareRef}`,
            );
          }
        }

        const driver = createDriver({
          id: pd.id,
          mac: pd.macAddress,
          description: pd.description,
          remoteLogging: pd.remoteLogging,
          ledConfig: pd.ledConfig,
          resolvedHardware,
          state: 'disconnected',
          disabled: pd.disabled,
        });
        this.drivers.set(driver.id, driver);
      }
      log.info(`Loaded ${persistedDrivers.length} known drivers from persistence`);
    }
  }

  // Register or update a driver from MQTT telemetry message
  registerDriver(telemetryData: {
    // Network info (reported by driver)
    ip: string;
    mac: string;
    hostname: string;
    ssid: string;
    // Runtime metrics
    rssi: number;
    freeHeap: number;
    minFreeHeap: number;
    uptimeMs: number;
    // Hardware/firmware telemetry
    telemetry: DriverTelemetry;
    // Runtime state
    testActive?: boolean;
    // Stats
    mqttMessagesReceived?: number;
    udpMessagesReceived?: number;
  }): Driver {
    const registerStartTime = Date.now();
    const macAddress = telemetryData.mac || 'unknown';
    log.info(`[DEBUG] registerDriver called for MAC ${macAddress} at ${registerStartTime}`);

    // Phase 1: Identity resolution (creates driver in persistence if new)
    const { driverId, persistedDriver } = this.resolveDriverIdentity(macAddress);

    // Phase 2: Find existing in registry
    const existingDriver =
      this.drivers.get(driverId) ?? this.findExistingDriverByMac(macAddress, driverId);

    // Phase 3: Clean up old ID if migrated
    this.handleIdMigration(existingDriver, driverId);

    // Phase 4: Calculate stats
    const stats = this.calculateDriverStats(existingDriver);

    // Phase 5: Construct and store driver
    const driver = this.constructDriver(
      driverId, telemetryData, persistedDriver, existingDriver, stats,
    );
    this.drivers.set(driver.id, driver);
    log.info(
      `[DEBUG] Driver object created and stored in registry for ${driverId} (elapsed: ${Date.now() - registerStartTime}ms)`,
    );

    // Phase 7: Emit event if new connection
    if (this.isNewConnection(existingDriver)) {
      log.info(`Driver connected: ${driverId}`);
      log.info(`[DEBUG] Emitting driver:connected event for ${driverId}`);
      eventBus.emit('driver:connected', { driver });
      log.info(
        `[DEBUG] driver:connected event emitted for ${driverId} (total elapsed: ${Date.now() - registerStartTime}ms)`,
      );
    } else {
      log.debug(`Driver ${driverId} already connected - skipping driver:connected event`);
    }

    return driver;
  }

  /**
   * Resolve driver identity and persistence
   * Returns the driver ID and persisted data, creating new driver in persistence if needed
   */
  private resolveDriverIdentity(macAddress: string): {
    driverId: string;
    persistedDriver?: PersistedDriver;
  } {
    // Try to find existing driver by MAC address in persistence
    let persistedDriver: PersistedDriver | undefined;

    if (this.persistence) {
      persistedDriver = this.persistence.getDriverByMac(macAddress);
    }
    let driverId: string = persistedDriver?.id ?? macAddress;

    log.info(`[DEBUG] Using driver ID: ${driverId} (MAC: ${macAddress})`);

    // If this is a completely new driver (not in persistence), create it
    if (this.persistence && !persistedDriver) {
      const newId = this.persistence.generateNextDriverId();
      this.persistence.addDriver(newId, macAddress);
      persistedDriver = this.persistence.getDriver(newId);
      driverId = newId; // Update driverId to use the newly generated ID
      log.info(`[DEBUG] Created new driver: ${newId} (MAC: ${macAddress})`);
    }

    return { driverId, persistedDriver };
  }

  /**
   * Find existing driver in registry by MAC (handles ID migration)
   */
  private findExistingDriverByMac(macAddress: string, currentId: string): Driver | undefined {
    for (const driver of this.drivers.values()) {
      if (driver.mac === macAddress && driver.id !== currentId) {
        log.info(
          `[DEBUG] Found existing driver by MAC with different ID: ${driver.id} (will migrate to ${currentId})`,
        );
        return driver;
      }
    }
    return undefined;
  }

  /**
   * Calculate driver statistics for a telemetry event.
   * Hub maintains authoritative counters - we don't use driver-reported counts
   * because telemetry arrives periodically while hub counters update in real-time.
   */
  private calculateDriverStats(existingDriver?: Driver) {
    return {
      telemetryEventsReceived: (existingDriver?.stats.telemetryEventsReceived ?? 0) + 1,
      mqttMessagesReceived: (existingDriver?.stats.mqttMessagesReceived ?? 0) + 1,
      mqttMessagesFailed: existingDriver?.stats.mqttMessagesFailed ?? 0,
    };
  }

  /**
   * Build complete Driver object
   */
  private constructDriver(
    driverId: string,
    telemetryData: {
      ip: string;
      mac: string;
      hostname: string;
      ssid: string;
      rssi: number;
      freeHeap: number;
      minFreeHeap: number;
      uptimeMs: number;
      telemetry: DriverTelemetry;
      testActive?: boolean;
    },
    persistedDriver: PersistedDriver | undefined,
    existingDriver: Driver | undefined,
    stats: {
      telemetryEventsReceived: number;
      mqttMessagesReceived: number;
      mqttMessagesFailed: number;
    },
  ): Driver {
    const now = Date.now();

    return createDriver({
      id: driverId,
      description: persistedDriver?.description,
      remoteLogging: persistedDriver?.remoteLogging,
      ip: telemetryData.ip,
      mac: telemetryData.mac,
      hostname: telemetryData.hostname,
      ssid: telemetryData.ssid,
      rssi: telemetryData.rssi,
      freeHeap: telemetryData.freeHeap,
      minFreeHeap: telemetryData.minFreeHeap,
      uptimeMs: telemetryData.uptimeMs,
      lastSeen: now,
      failedHeartbeats: 0,
      lastHeartbeat: now,
      lastSeenAt: now,
      telemetry: telemetryData.telemetry,
      ledConfig: persistedDriver?.ledConfig,
      resolvedHardware: existingDriver?.resolvedHardware,
      stats,
      testActive: telemetryData.testActive,
      state: telemetryData.ip && telemetryData.ip.trim().length > 0 ? 'connected' : 'disconnected',
      disabled: persistedDriver?.disabled ?? existingDriver?.disabled ?? false,
    });
  }

  /**
   * Handle ID migration cleanup (remove old registry entry if ID changed)
   */
  private handleIdMigration(existingDriver: Driver | undefined, newDriverId: string): void {
    if (existingDriver && existingDriver.id !== newDriverId) {
      log.info(
        `[DEBUG] Driver ID changed: ${existingDriver.id} → ${newDriverId}. Removing old registry entry.`,
      );
      this.drivers.delete(existingDriver.id);
    }
  }

  /**
   * Detect new connection (returns true if driver wasn't previously connected)
   */
  private isNewConnection(existingDriver?: Driver): boolean {
    const wasConnected = existingDriver?.state === 'connected';
    log.info(
      `[DEBUG] Connection check: existingDriver=${existingDriver ? 'found' : 'not found'}, ` +
        `wasConnected=${wasConnected}`,
    );
    return !wasConnected;
  }

  // Get driver by ID
  getDriver(driverId: string): Driver | undefined {
    return this.drivers.get(driverId);
  }

  // Get driver by MAC address
  getDriverByMac(macAddress: string): Driver | undefined {
    return Array.from(this.drivers.values()).find((driver) => driver.mac === macAddress);
  }

  // Find driver by IP address
  findByIp(ip: string): Driver | undefined {
    return Array.from(this.drivers.values()).find((driver) => driver.ip === ip);
  }

  // Update lastSeenAt timestamp for a driver (keeps driver marked as connected)
  // Used during OTA updates when telemetry stops but driver is still responsive
  touchDriver(driverId: string): Driver | undefined {
    const driver = this.drivers.get(driverId);

    if (!driver) {
      return undefined;
    }

    driver.lastSeenAt = Date.now();
    this.drivers.set(driverId, driver);
    return driver;
  }

  // Delete a driver from the runtime registry
  deleteDriver(driverId: string): boolean {
    return this.drivers.delete(driverId);
  }

  // Get count of connected drivers only
  getConnectedCount(): number {
    return Array.from(this.drivers.values()).reduce(
      (count, driver) => count + (driver.state === 'connected' ? 1 : 0),
      0,
    );
  }

  // Get all drivers (connected and disconnected)
  getAllDrivers(): Driver[] {
    return [...this.drivers.values()];
  }

  getConnectedDrivers(): Driver[] {
    return this.getAllDrivers().filter((d) => d.state === 'connected');
  }

  /**
   * Start monitoring driver connections for timeouts.
   * Checks every 5 seconds for drivers that haven't sent telemetry in >30 seconds.
   * This is the single source of truth for connection state - renderer should not
   * independently monitor timeouts.
   */
  startConnectionMonitor(): void {
    if (this.connectionMonitorInterval) {
      log.warn('Connection monitor already running');
      return;
    }

    log.info('Starting driver connection monitor');
    this.connectionMonitorInterval = setInterval(() => {
      const now = Date.now();

      for (const driver of this.drivers.values()) {
        // Skip drivers that aren't connected or don't have lastSeenAt
        if (driver.state !== 'connected' || !driver.lastSeenAt) {
          continue;
        }

        const timeSinceLastSeen = now - driver.lastSeenAt;

        if (timeSinceLastSeen > DRIVER_CONNECTION_TIMEOUT_MS) {
          log.info(
            `Driver ${driver.id} timed out (last seen ${Math.round(timeSinceLastSeen / 1000)}s ago)`,
          );

          // Update driver state to disconnected
          const updatedDriver = { ...driver, state: 'disconnected' as const };
          this.drivers.set(driver.id, updatedDriver);

          // Emit disconnect event with 'timeout' reason
          eventBus.emit('driver:disconnected', { driver: updatedDriver, reason: 'timeout' });
        }
      }
    }, DRIVER_CONNECTION_CHECK_INTERVAL_MS);
  }

  /**
   * Stop the connection monitor (for cleanup)
   */
  stopConnectionMonitor(): void {
    if (this.connectionMonitorInterval) {
      clearInterval(this.connectionMonitorInterval);
      this.connectionMonitorInterval = undefined;
      log.info('Stopped driver connection monitor');
    }
  }

  /**
   * Refresh a driver from persistence after config changes (e.g., rename)
   * Updates the runtime driver and returns the updated driver for IPC notification
   */
  refreshDriverFromPersistence(
    macAddress: string,
    ledHardwareManager: LEDHardwareManager,
  ): Driver | undefined {
    if (!this.persistence) {
      return undefined;
    }

    const persistedDriver = this.persistence.getDriverByMac(macAddress);

    if (!persistedDriver) {
      log.warn(`Cannot refresh driver: no persisted driver found for MAC ${macAddress}`);
      return undefined;
    }

    // Find the existing runtime driver by MAC
    const existingDriver = this.getDriverByMac(macAddress);

    if (!existingDriver) {
      log.warn(`Cannot refresh driver: no runtime driver found for MAC ${macAddress}`);
      return undefined;
    }

    const oldId = existingDriver.id;
    const newId = persistedDriver.id;

    // Resolve LED hardware if config exists
    const { resolvedHardware: existingHardware } = existingDriver;
    let resolvedHardware: LEDHardware | undefined = existingHardware;

    if (persistedDriver.ledConfig?.hardwareRef) {
      const hardware = ledHardwareManager.loadHardware(persistedDriver.ledConfig.hardwareRef);

      if (hardware) {
        resolvedHardware = hardware;
      }
    }

    // Create updated driver with new ID and config
    const updatedDriver = createDriver({
      ...existingDriver,
      id: newId,
      description: persistedDriver.description,
      remoteLogging: persistedDriver.remoteLogging,
      ledConfig: persistedDriver.ledConfig,
      resolvedHardware,
      disabled: persistedDriver.disabled,
    });

    // Remove old entry if ID changed
    if (oldId !== newId) {
      this.drivers.delete(oldId);
      log.info(`Driver ID changed in registry: ${oldId} → ${newId}`);
    }

    // Store updated driver
    this.drivers.set(newId, updatedDriver);
    log.info(`Refreshed driver ${newId} from persistence`);

    return updatedDriver;
  }
}
