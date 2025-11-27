/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log/main';
import type { DriverLEDConfig } from './types';
import { CONFIG_VERSION, CONFIG_DIRECTORY } from './config/constants';
import {
  PersistedDriverSchema,
  DriversConfigFileRawSchema,
  type PersistedDriverFromSchema,
  type DriversConfigFile,
} from './schemas';

/**
 * Re-export the Zod-inferred type as PersistedDriver for backward compatibility
 */
export type PersistedDriver = PersistedDriverFromSchema;

/**
 * Manages persistent driver data in unified JSON format
 *
 * Responsibilities:
 * - Load/save all driver data from single JSON file
 * - Persist driver discovery (id, macAddress, description)
 * - Persist LED configurations (nested in each driver entry)
 * - Provide drivers to DriverRegistry for runtime tracking
 *
 * What gets persisted: id, macAddress, description, ledConfig
 * What is runtime-only: ip, lastSeen, connected, stats
 */
export class DriverPersistence {
  private configFile: string;
  private drivers = new Map<string, PersistedDriver>();
  private readonly version = CONFIG_VERSION;

  constructor(baseDir = CONFIG_DIRECTORY) {
    this.configFile = path.resolve(baseDir, 'drivers.json');

    // Ensure config directory exists
    this.ensureDirectory(baseDir);

    // Load existing configuration
    this.loadConfig();
  }

  /**
   * Ensure config directory exists
   */
  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log.info(`Created config directory: ${dir}`);
    }
  }

  /**
   * Load all drivers from unified config file
   */
  private loadConfig(): void {
    if (!fs.existsSync(this.configFile)) {
      log.info(`No existing drivers config found at ${this.configFile} - starting fresh`);
      return;
    }

    try {
      const data = fs.readFileSync(this.configFile, 'utf8');
      const parsed: unknown = JSON.parse(data);

      // Validate config file structure (version + drivers array exists)
      const result = DriversConfigFileRawSchema.safeParse(parsed);
      if (!result.success) {
        log.error(`Invalid drivers config: ${result.error.message}`);
        return;
      }

      // Validate each driver entry individually for graceful skip of invalid entries
      let validCount = 0;
      for (const driver of result.data.drivers) {
        const driverResult = PersistedDriverSchema.safeParse(driver);
        if (driverResult.success) {
          this.drivers.set(driverResult.data.id, driverResult.data);
          validCount++;
        } else {
          log.error(`Skipping invalid driver entry: ${driverResult.error.message}`);
        }
      }

      log.info(
        `Loaded ${validCount} valid drivers from ${this.configFile} (${result.data.drivers.length - validCount} invalid entries skipped)`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Failed to load drivers config: ${errorMessage}`);
    }
  }

  /**
   * Save all drivers to unified config file
   */
  saveConfig(): void {
    const config: DriversConfigFile = {
      version: this.version,
      drivers: Array.from(this.drivers.values()),
    };

    try {
      const json = JSON.stringify(config, null, 2);
      fs.writeFileSync(this.configFile, json, 'utf8');
      log.info(`Saved ${this.drivers.size} drivers to ${this.configFile}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Failed to save drivers config: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Add a newly discovered driver
   * Returns true if driver was added, false if it already exists
   */
  addDriver(id: string, macAddress: string): boolean {
    if (this.drivers.has(id)) {
      return false; // Driver already exists
    }

    const driver = {
      id,
      macAddress,
      ledConfig: null,
    };

    // Validate with Zod schema
    const result = PersistedDriverSchema.safeParse(driver);
    if (!result.success) {
      log.error(`Invalid driver data: ${result.error.message}`);
      return false;
    }

    this.drivers.set(id, result.data);
    this.saveConfig();
    log.info(`Added new driver: ${id} (MAC: ${macAddress})`);
    return true;
  }

  /**
   * Update driver metadata (description)
   * Does not update ledConfig - use setDriverLEDConfig for that
   */
  updateDriver(id: string, updates: Partial<Pick<PersistedDriver, 'description'>>): boolean {
    const driver = this.drivers.get(id);
    if (!driver) {
      log.warn(`Cannot update non-existent driver: ${id}`);
      return false;
    }

    const updated = { ...driver, ...updates };
    this.drivers.set(id, updated);
    this.saveConfig();
    log.info(`Updated driver ${id}:`, updates);
    return true;
  }

  /**
   * Get LED configuration for a specific driver
   */
  getLEDConfig(id: string): DriverLEDConfig | null | undefined {
    return this.drivers.get(id)?.ledConfig;
  }

  /**
   * Set LED configuration for a specific driver
   */
  setLEDConfig(id: string, ledConfig: DriverLEDConfig): boolean {
    const driver = this.drivers.get(id);
    if (!driver) {
      log.warn(`Cannot set LED config for non-existent driver: ${id}`);
      return false;
    }

    driver.ledConfig = ledConfig;
    this.drivers.set(id, driver);
    this.saveConfig();
    log.info(`Set LED config for driver ${id}: ${ledConfig.hardwareRef}`);
    return true;
  }

  /**
   * Get all known drivers (for UI and DriverRegistry initialization)
   */
  getAllDrivers(): PersistedDriver[] {
    return Array.from(this.drivers.values());
  }

  /**
   * Get a specific driver by ID
   */
  getDriver(id: string): PersistedDriver | undefined {
    return this.drivers.get(id);
  }

  /**
   * Check if a driver exists
   */
  hasDriver(id: string): boolean {
    return this.drivers.has(id);
  }

  /**
   * Get a driver by its MAC address
   */
  getDriverByMac(macAddress: string): PersistedDriver | undefined {
    for (const driver of this.drivers.values()) {
      if (driver.macAddress === macAddress) {
        return driver;
      }
    }
    return undefined;
  }

  /**
   * Generate next sequential driver ID
   * Checks ALL drivers (including offline) to find the highest number
   */
  generateNextDriverId(): string {
    const allDrivers = this.getAllDrivers();

    const existingNumbers = allDrivers
      .map((d) => /^rgfx-driver-(\d+)$/.exec(d.id)?.[1])
      .filter((n): n is string => n !== undefined)
      .map(Number);

    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNum = maxNum + 1;

    return `rgfx-driver-${String(nextNum).padStart(4, '0')}`;
  }

  /**
   * Delete a driver and its configuration
   */
  deleteDriver(id: string): boolean {
    const hasDriver = this.drivers.has(id);
    if (!hasDriver) {
      return false;
    }

    this.drivers.delete(id);
    this.saveConfig();
    log.info(`Deleted driver: ${id}`);
    return true;
  }
}
