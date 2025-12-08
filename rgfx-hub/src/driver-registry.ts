/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';
import { Driver, type DriverTelemetry, type LEDHardware } from './types';
import type { DriverPersistence, PersistedDriver } from './driver-persistence';
import type { LEDHardwareManager } from './led-hardware-manager';

export class DriverRegistry {
  private drivers = new Map<string, Driver>();
  private onDriverConnectedCallback?: (driver: Driver) => void;
  private onDriverDisconnectedCallback?: (driver: Driver) => void;
  private persistence?: DriverPersistence;

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

        const driver = new Driver({
          id: pd.id,
          mac: pd.macAddress,
          description: pd.description,
          remoteLogging: pd.remoteLogging,
          lastSeen: 0,
          failedHeartbeats: 0,
          ledConfig: pd.ledConfig,
          resolvedHardware,
          stats: {
            mqttMessagesReceived: 0,
            mqttMessagesFailed: 0,
            udpMessagesSent: 0,
            udpMessagesFailed: 0,
          },
          connected: false, // Persisted drivers start as disconnected
        });
        this.drivers.set(driver.id, driver);
      }
      log.info(`Loaded ${persistedDrivers.length} known drivers from persistence`);
    }
  }

  // Set callback for when a driver connects (new or reconnecting)
  onDriverConnected(callback: (driver: Driver) => void) {
    this.onDriverConnectedCallback = callback;
  }

  // Set callback for when a driver disconnects (timeout)
  onDriverDisconnected(callback: (driver: Driver) => void) {
    this.onDriverDisconnectedCallback = callback;
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
    const stats = this.calculateDriverStats(telemetryData, existingDriver);

    // Phase 5: Construct and store driver
    const driver = this.constructDriver(
      driverId, telemetryData, persistedDriver, existingDriver, stats,
    );
    this.drivers.set(driver.id, driver);
    log.info(
      `[DEBUG] Driver object created and stored in registry for ${driverId} (elapsed: ${Date.now() - registerStartTime}ms)`,
    );

    // Phase 7: Trigger callback if new connection
    if (this.isNewConnection(existingDriver)) {
      log.info(`Driver connected: ${driverId}`);
      log.info(`[DEBUG] Calling onDriverConnectedCallback for ${driverId}`);
      this.onDriverConnectedCallback?.(driver);
      log.info(
        `[DEBUG] onDriverConnectedCallback completed for ${driverId} (total elapsed: ${Date.now() - registerStartTime}ms)`,
      );
    } else {
      log.debug(`Driver ${driverId} already connected - skipping onDriverConnectedCallback`);
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
   * Calculate driver statistics (initialize for new drivers, increment for existing)
   */
  private calculateDriverStats(
    telemetryData: {
      mqttMessagesReceived?: number;
      udpMessagesReceived?: number;
    },
    existingDriver?: Driver,
  ) {
    return {
      mqttMessagesReceived:
        telemetryData.mqttMessagesReceived ??
        (existingDriver?.stats.mqttMessagesReceived ?? 0) + 1,
      mqttMessagesFailed: existingDriver?.stats.mqttMessagesFailed ?? 0,
      udpMessagesSent:
        telemetryData.udpMessagesReceived ?? existingDriver?.stats.udpMessagesSent ?? 0,
      udpMessagesFailed: existingDriver?.stats.udpMessagesFailed ?? 0,
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
      mqttMessagesReceived: number;
      mqttMessagesFailed: number;
      udpMessagesSent: number;
      udpMessagesFailed: number;
    },
  ): Driver {
    const now = Date.now();

    return new Driver({
      id: driverId,
      description: persistedDriver?.description,
      remoteLogging: persistedDriver?.remoteLogging,
      // Network information
      ip: telemetryData.ip,
      mac: telemetryData.mac,
      hostname: telemetryData.hostname,
      ssid: telemetryData.ssid,
      // Runtime metrics
      rssi: telemetryData.rssi,
      freeHeap: telemetryData.freeHeap,
      minFreeHeap: telemetryData.minFreeHeap,
      uptimeMs: telemetryData.uptimeMs,
      // Connection tracking
      lastSeen: now,
      failedHeartbeats: 0,
      lastHeartbeat: now,
      lastSeenAt: now, // Timestamp for connection detection
      // Hardware/firmware telemetry
      telemetry: telemetryData.telemetry,
      // LED configuration
      ledConfig: persistedDriver?.ledConfig,
      resolvedHardware: existingDriver?.resolvedHardware,
      // Statistics
      stats,
      // Runtime state
      testActive: telemetryData.testActive,
      // Driver is only connected if it has a valid IP address
      connected: Boolean(telemetryData.ip && telemetryData.ip.trim().length > 0),
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
    const wasConnected = existingDriver?.connected ?? false;
    log.info(
      `[DEBUG] Connection check: existingDriver=${existingDriver ? 'found' : 'not found'}, ` +
        `wasConnected=${wasConnected}, callbackRegistered=${this.onDriverConnectedCallback !== undefined}`,
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

  // Track UDP message sent to driver
  trackUdpSent(ip: string, success: boolean): Driver | undefined {
    const driver = this.findByIp(ip);

    if (!driver) {
      log.warn(`trackUdpSent: No driver found with IP ${ip}`);
      return undefined;
    }

    // Update stats based on success/failure
    if (success) {
      driver.stats.udpMessagesSent++;
    } else {
      driver.stats.udpMessagesFailed++;
    }

    const statType = success ? 'sent' : 'failed';
    const statCount = success ? driver.stats.udpMessagesSent : driver.stats.udpMessagesFailed;
    log.info(`UDP ${statType} to ${driver.id}: ${statCount} total`);

    this.drivers.set(driver.id, driver);

    // Notify callback so main can update renderer
    this.onDriverConnectedCallback?.(driver);

    return driver;
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

  // Get count of connected drivers only
  getConnectedCount(): number {
    return Array.from(this.drivers.values()).reduce(
      (count, driver) => count + (driver.connected ? 1 : 0),
      0,
    );
  }

  // Get all drivers (connected and disconnected)
  getAllDrivers(): Driver[] {
    return [...this.drivers.values()];
  }

  getConnectedDrivers(): Driver[] {
    return this.getAllDrivers().filter((d) => d.connected);
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
    const updatedDriver = new Driver({
      id: newId,
      description: persistedDriver.description,
      ip: existingDriver.ip,
      mac: existingDriver.mac,
      hostname: existingDriver.hostname,
      ssid: existingDriver.ssid,
      remoteLogging: persistedDriver.remoteLogging,
      rssi: existingDriver.rssi,
      freeHeap: existingDriver.freeHeap,
      minFreeHeap: existingDriver.minFreeHeap,
      uptimeMs: existingDriver.uptimeMs,
      lastSeen: existingDriver.lastSeen,
      failedHeartbeats: existingDriver.failedHeartbeats,
      lastHeartbeat: existingDriver.lastHeartbeat,
      lastSeenAt: existingDriver.lastSeenAt,
      telemetry: existingDriver.telemetry,
      ledConfig: persistedDriver.ledConfig,
      resolvedHardware,
      stats: existingDriver.stats,
      updateRate: existingDriver.updateRate,
      testActive: existingDriver.testActive,
      connected: existingDriver.connected,
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
