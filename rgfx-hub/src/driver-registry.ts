/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from "electron-log/main";
import type { Driver, DriverSystemInfo } from "./types";
import type { DriverPersistence } from "./driver-persistence";

// Driver timeout threshold (35 seconds = 30s poll + 5s grace)
const DRIVER_TIMEOUT_MS = 35000;

export class DriverRegistry {
  private drivers = new Map<string, Driver>();
  private onDriverConnectedCallback?: (driver: Driver) => void;
  private onDriverDisconnectedCallback?: (driver: Driver) => void;
  private persistence?: DriverPersistence;

  constructor(persistence?: DriverPersistence) {
    this.persistence = persistence;

    // Load all known drivers from persistence (all start as disconnected)
    if (persistence) {
      const persistedDrivers = persistence.getAllDrivers();
      for (const pd of persistedDrivers) {
        const driver: Driver = {
          id: pd.id,
          name: pd.name,
          type: pd.type,
          connected: false,
          lastSeen: 0,
          firstSeen: pd.firstSeen,
          ledConfig: pd.ledConfig,
          stats: {
            mqttMessagesReceived: 0,
            mqttMessagesFailed: 0,
            udpMessagesSent: 0,
            udpMessagesFailed: 0,
          },
        };
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

  // Register or update a driver from MQTT connect message
  registerDriver(sysInfo: DriverSystemInfo): Driver {
    const driverId = sysInfo.mac || sysInfo.ip || "unknown";
    const existingDriver = this.drivers.get(driverId);
    const now = Date.now();
    const isNewDriver = !existingDriver;

    // Determine firstSeen timestamp (immutable once set)
    let firstSeen = existingDriver?.firstSeen;

    // If this is a new driver, persist it with the current timestamp
    if (isNewDriver && this.persistence) {
      const name = sysInfo.hostname || sysInfo.ip || "Driver";
      this.persistence.addDriver(driverId, name, "driver");
      // Get the firstSeen from the persisted driver to ensure consistency
      const persistedDriver = this.persistence.getDriver(driverId);
      firstSeen ??= persistedDriver?.firstSeen ?? now;
    }

    // Fallback for drivers without persistence or missing firstSeen
    firstSeen ??= now;

    const driver: Driver = {
      id: driverId,
      name: sysInfo.hostname || sysInfo.ip || "Driver",
      type: "driver",
      connected: true,
      lastSeen: now,
      firstSeen: firstSeen,
      ip: sysInfo.ip,
      sysInfo: sysInfo,
      ledConfig: existingDriver?.ledConfig, // Preserve LED config from persistence
      stats: {
        mqttMessagesReceived:
          (existingDriver?.stats.mqttMessagesReceived ?? 0) + 1,
        mqttMessagesFailed: existingDriver?.stats.mqttMessagesFailed ?? 0,
        udpMessagesSent: existingDriver?.stats.udpMessagesSent ?? 0,
        udpMessagesFailed: existingDriver?.stats.udpMessagesFailed ?? 0,
      },
    };

    this.drivers.set(driver.id, driver);

    // Notify if this is a new driver or was previously disconnected
    if (!existingDriver?.connected) {
      log.info(`Driver connected: ${driver.name} (${driverId})`);
      this.onDriverConnectedCallback?.(driver);
    } else {
      // Existing connected driver - shouldn't happen if using heartbeat properly
      log.warn(`Driver ${driver.name} (${driverId}) sent connect message while already connected - should use heartbeat instead`);
    }

    return driver;
  }

  // Update driver heartbeat (simple keepalive, no config republish)
  updateHeartbeat(driverId: string): Driver | undefined {
    const driver = this.drivers.get(driverId);

    if (!driver) {
      log.warn(`Heartbeat from unknown driver: ${driverId} - driver should connect first`);
      return undefined;
    }

    const now = Date.now();
    driver.lastSeen = now;

    // If driver was previously disconnected, mark as reconnected
    if (!driver.connected) {
      log.info(`Driver reconnected via heartbeat: ${driver.name} (${driverId})`);
      driver.connected = true;
      this.onDriverConnectedCallback?.(driver);
    }

    this.drivers.set(driverId, driver);
    return driver;
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

  // Check for timed-out drivers and mark them as disconnected
  checkTimeouts(): number {
    const now = Date.now();
    let disconnectedCount = 0;

    log.info(`Checking driver timeouts for ${this.drivers.size} drivers...`);

    this.drivers.forEach((driver, driverId) => {
      const timeSinceLastSeen = now - driver.lastSeen;
      log.info(
        `Driver ${driver.name}: connected=${driver.connected}, lastSeen=${timeSinceLastSeen}ms ago, threshold=${DRIVER_TIMEOUT_MS}ms`,
      );

      if (driver.connected && timeSinceLastSeen > DRIVER_TIMEOUT_MS) {
        log.info(
          `Driver ${driver.name} (${driverId}) timed out - marking as disconnected`,
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
