/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from "electron-log/main";
import type { Driver, DriverSystemInfo, LEDHardware } from "./types";
import type {
  DriverPersistence,
  PersistedDriver,
} from "./driver-persistence";
import type { LEDHardwareManager } from "./led-hardware-manager";
import { HEARTBEAT_FAILURE_THRESHOLD } from "./config/constants";

export class DriverRegistry {
  private drivers = new Map<string, Driver>();
  private onDriverConnectedCallback?: (driver: Driver) => void;
  private onDriverDisconnectedCallback?: (driver: Driver) => void;
  private persistence?: DriverPersistence;
  private ledHardwareManager?: LEDHardwareManager;

  constructor(
    persistence?: DriverPersistence,
    ledHardwareManager?: LEDHardwareManager,
  ) {
    this.persistence = persistence;
    this.ledHardwareManager = ledHardwareManager;

    // Load all known drivers from persistence (all start as disconnected)
    if (persistence && ledHardwareManager) {
      const persistedDrivers = persistence.getAllDrivers();
      for (const pd of persistedDrivers) {
        // Resolve LED hardware if config exists
        let resolvedHardware: LEDHardware | undefined = undefined;
        if (pd.ledConfig?.hardwareRef) {
          const hardware = ledHardwareManager.loadHardware(
            pd.ledConfig.hardwareRef,
          );
          if (hardware) {
            resolvedHardware = hardware;
          } else {
            log.warn(
              `Failed to resolve LED hardware for driver ${pd.id}: ${pd.ledConfig.hardwareRef}`,
            );
          }
        }

        const driver: Driver = {
          id: pd.id,
          name: pd.name,
          description: pd.description,
          connected: false,
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
        };
        this.drivers.set(driver.id, driver);
      }
      log.info(
        `Loaded ${persistedDrivers.length} known drivers from persistence`,
      );
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

  // Register or update a driver from MQTT connect message
  registerDriver(sysInfo: DriverSystemInfo): Driver {
    const registerStartTime = Date.now();
    const macAddress = sysInfo.mac || "unknown";
    log.info(
      `[DEBUG] registerDriver called for MAC ${macAddress} at ${registerStartTime}`,
    );

    // Try to find existing driver by MAC address in persistence
    let persistedDriver: PersistedDriver | undefined;
    if (this.persistence) {
      persistedDriver = this.persistence.getDriverByMac(macAddress);
    }
    const driverId: string = persistedDriver?.id ?? macAddress;

    log.info(
      `[DEBUG] Using driver ID: ${driverId} (MAC: ${macAddress})`,
    );

    // Look for existing driver in registry (could be under old ID or new ID)
    let existingDriver = this.drivers.get(driverId);

    // If not found by new ID, search all drivers by MAC to find old entry
    if (!existingDriver) {
      for (const driver of this.drivers.values()) {
        if (driver.sysInfo?.mac === macAddress) {
          existingDriver = driver;
          log.info(
            `[DEBUG] Found existing driver by MAC with different ID: ${driver.id} (will migrate to ${driverId})`,
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
      const name = `Driver ${newId.split('-')[2]}`; // Extract number for name
      this.persistence.addDriver(newId, macAddress, name);
      persistedDriver = this.persistence.getDriver(newId);
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
        `[DEBUG] Driver ID changed: ${existingDriver.id} → ${driverId}. Removing old registry entry.`,
      );
      this.drivers.delete(existingDriver.id);
    }

    const driver: Driver = {
      id: driverId,
      name: sysInfo.hostname || sysInfo.ip || "Driver",
      description: existingDriver?.description, // Preserve description from persistence
      connected: true,
      lastSeen: now,
      firstSeen: firstSeen,
      failedHeartbeats: 0, // Reset on connect
      ip: sysInfo.ip,
      sysInfo: sysInfo,
      testActive: sysInfo.testActive, // Use driver's reported test state
      ledConfig: existingDriver?.ledConfig, // Preserve LED config (hardware ref + settings)
      resolvedHardware: existingDriver?.resolvedHardware, // Preserve resolved hardware
      stats: {
        mqttMessagesReceived:
          (existingDriver?.stats.mqttMessagesReceived ?? 0) + 1,
        mqttMessagesFailed: existingDriver?.stats.mqttMessagesFailed ?? 0,
        udpMessagesSent: existingDriver?.stats.udpMessagesSent ?? 0,
        udpMessagesFailed: existingDriver?.stats.udpMessagesFailed ?? 0,
      },
    };

    this.drivers.set(driver.id, driver);
    log.info(
      `[DEBUG] Driver object created and stored in registry for ${driverId} (elapsed: ${Date.now() - registerStartTime}ms)`,
    );

    // Notify if this is a new driver or was previously disconnected
    if (!existingDriver?.connected) {
      log.info(`Driver connected: ${driver.name} (${driverId})`);
      log.info(`[DEBUG] Calling onDriverConnectedCallback for ${driverId}`);
      this.onDriverConnectedCallback?.(driver);
      log.info(
        `[DEBUG] onDriverConnectedCallback completed for ${driverId} (total elapsed: ${Date.now() - registerStartTime}ms)`,
      );
    } else {
      // Existing connected driver - shouldn't happen if using heartbeat properly
      log.warn(
        `Driver ${driver.name} (${driverId}) sent connect message while already connected - should use heartbeat instead`,
      );
    }

    return driver;
  }

  // Update driver heartbeat (simple keepalive, no config republish)
  updateHeartbeat(driverId: string): Driver | undefined {
    const driver = this.drivers.get(driverId);

    if (!driver) {
      log.warn(
        `Heartbeat from unknown driver: ${driverId} - driver should connect first`,
      );
      return undefined;
    }

    const now = Date.now();
    driver.lastSeen = now;
    driver.failedHeartbeats = 0; // Reset failure counter on successful heartbeat

    // If driver was previously disconnected, mark as reconnected
    if (!driver.connected) {
      log.info(
        `Driver reconnected via heartbeat: ${driver.name} (${driverId})`,
      );
      driver.connected = true;
      this.onDriverConnectedCallback?.(driver);
    }

    this.drivers.set(driverId, driver);
    return driver;
  }

  // Get driver by ID
  getDriver(driverId: string): Driver | undefined {
    return this.drivers.get(driverId);
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

    const statType = success ? "sent" : "failed";
    const statCount = success
      ? driver.stats.udpMessagesSent
      : driver.stats.udpMessagesFailed;
    log.info(`UDP ${statType} to ${driver.name}: ${statCount} total`);

    this.drivers.set(driver.id, driver);

    // Notify callback so main can update renderer
    this.onDriverConnectedCallback?.(driver);

    return driver;
  }

  // Process heartbeat failures for drivers that didn't respond to discovery ping
  processHeartbeatFailures(respondedDriverIds: Set<string>): number {
    let disconnectedCount = 0;

    log.info(
      `Processing heartbeat failures. ${respondedDriverIds.size} drivers responded out of ${this.drivers.size} total`,
    );

    this.drivers.forEach((driver, driverId) => {
      // Skip already disconnected drivers
      if (!driver.connected) {
        return;
      }

      if (respondedDriverIds.has(driverId)) {
        // Driver responded - already handled in updateHeartbeat (resets failedHeartbeats)
        log.debug(`Driver ${driver.name} responded to heartbeat`);
      } else {
        // Driver did not respond - increment failure counter
        driver.failedHeartbeats++;
        log.info(
          `Driver ${driver.name} missed heartbeat. Failed attempts: ${driver.failedHeartbeats}/${HEARTBEAT_FAILURE_THRESHOLD}`,
        );

        // Check if driver should be disconnected
        if (driver.failedHeartbeats >= HEARTBEAT_FAILURE_THRESHOLD) {
          log.info(
            `Driver ${driver.name} (${driverId}) exceeded failure threshold - marking as disconnected`,
          );

          // Mark as disconnected
          driver.connected = false;
          this.drivers.set(driverId, driver);

          // Notify callback
          if (this.onDriverDisconnectedCallback) {
            this.onDriverDisconnectedCallback(driver);
            log.info(`Sent driver:disconnected event`);
            disconnectedCount++;
          }
        } else {
          // Update driver with incremented failure count
          this.drivers.set(driverId, driver);
        }
      }
    });

    return disconnectedCount;
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
    return Array.from(this.drivers.values());
  }
}
