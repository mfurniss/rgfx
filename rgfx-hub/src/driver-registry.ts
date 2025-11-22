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
              `Failed to resolve LED hardware for driver ${pd.id}: ${pd.ledConfig.hardwareRef}`
            );
          }
        }

        const driver = new Driver({
          id: pd.id,
          description: pd.description,
          lastSeen: 0,
          firstSeen: pd.firstSeen,
          failedHeartbeats: 0,
          ledConfig: pd.ledConfig,
          resolvedHardware: resolvedHardware,
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

    // Try to find existing driver by MAC address in persistence
    let persistedDriver: PersistedDriver | undefined;
    if (this.persistence) {
      persistedDriver = this.persistence.getDriverByMac(macAddress);
    }
    let driverId: string = persistedDriver?.id ?? macAddress;

    log.info(`[DEBUG] Using driver ID: ${driverId} (MAC: ${macAddress})`);

    // Look for existing driver in registry (could be under old ID or new ID)
    let existingDriver = this.drivers.get(driverId);

    // If not found by new ID, search all drivers by MAC to find old entry
    if (!existingDriver) {
      for (const driver of this.drivers.values()) {
        if (driver.mac === macAddress) {
          existingDriver = driver;
          log.info(
            `[DEBUG] Found existing driver by MAC with different ID: ${driver.id} (will migrate to ${driverId})`
          );
          break;
        }
      }
    }

    const now = Date.now();
    const isNewDriver = !existingDriver;

    // Determine firstSeen timestamp (immutable once set)
    let firstSeen = existingDriver?.firstSeen;

    // If this is a completely new driver (not in persistence), create it
    if (isNewDriver && this.persistence && !persistedDriver) {
      const newId = this.persistence.generateNextDriverId();
      this.persistence.addDriver(newId, macAddress);
      persistedDriver = this.persistence.getDriver(newId);
      driverId = newId; // Update driverId to use the newly generated ID
      firstSeen = persistedDriver?.firstSeen ?? now;
      log.info(`[DEBUG] Created new driver: ${newId} (MAC: ${macAddress})`);
    } else if (persistedDriver) {
      firstSeen = persistedDriver.firstSeen;
    }

    // Fallback for drivers without persistence or missing firstSeen
    firstSeen ??= now;

    // If driver ID changed (MAC → custom ID), remove old registry entry
    if (existingDriver && existingDriver.id !== driverId) {
      log.info(
        `[DEBUG] Driver ID changed: ${existingDriver.id} → ${driverId}. Removing old registry entry.`
      );
      this.drivers.delete(existingDriver.id);
    }

    const driver = new Driver({
      id: driverId,
      description: persistedDriver?.description,
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
      firstSeen: firstSeen,
      failedHeartbeats: 0,
      lastHeartbeat: now,
      lastSeenAt: now, // Timestamp for connection detection
      // Hardware/firmware telemetry
      telemetry: telemetryData.telemetry,
      // LED configuration
      ledConfig: persistedDriver?.ledConfig,
      resolvedHardware: existingDriver?.resolvedHardware,
      // Statistics
      stats: {
        mqttMessagesReceived: telemetryData.mqttMessagesReceived ?? (existingDriver?.stats.mqttMessagesReceived ?? 0) + 1,
        mqttMessagesFailed: existingDriver?.stats.mqttMessagesFailed ?? 0,
        udpMessagesSent: telemetryData.udpMessagesReceived ?? existingDriver?.stats.udpMessagesSent ?? 0,
        udpMessagesFailed: existingDriver?.stats.udpMessagesFailed ?? 0,
      },
      // Runtime state
      testActive: telemetryData.testActive,
      connected: true, // Driver just sent telemetry, so it's connected
    });

    this.drivers.set(driver.id, driver);
    log.info(
      `[DEBUG] Driver object created and stored in registry for ${driverId} (elapsed: ${Date.now() - registerStartTime}ms)`
    );

    // Only notify on initial connection - not for subsequent telemetry updates
    const wasConnected = existingDriver?.connected ?? false;
    log.info(
      `[DEBUG] Connection check: existingDriver=${existingDriver ? 'found' : 'not found'}, ` +
        `wasConnected=${wasConnected}, callbackRegistered=${this.onDriverConnectedCallback !== undefined}`
    );
    if (!wasConnected) {
      log.info(`Driver connected: ${driverId}`);
      log.info(`[DEBUG] Calling onDriverConnectedCallback for ${driverId}`);
      this.onDriverConnectedCallback?.(driver);
      log.info(
        `[DEBUG] onDriverConnectedCallback completed for ${driverId} (total elapsed: ${Date.now() - registerStartTime}ms)`
      );
    } else {
      log.debug(`Driver ${driverId} already connected - skipping onDriverConnectedCallback`);
    }

    return driver;
  }


  // Get driver by ID
  getDriver(driverId: string): Driver | undefined {
    return this.drivers.get(driverId);
  }

  // Get driver by MAC address
  getDriverByMac(macAddress: string): Driver | undefined {
    return Array.from(this.drivers.values()).find(
      (driver) => driver.mac === macAddress
    );
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

  // Get count of connected drivers only
  getConnectedCount(): number {
    return Array.from(this.drivers.values()).reduce(
      (count, driver) => count + (driver.connected ? 1 : 0),
      0
    );
  }

  // Get all drivers (connected and disconnected)
  getAllDrivers(): Driver[] {
    return Array.from(this.drivers.values());
  }
}
