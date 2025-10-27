/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log/main';
import type { DriverConfig } from './types/driver-config';

/**
 * Persisted driver data structure
 * Stores static configuration and metadata, excludes runtime state
 */
export interface PersistedDriver {
  /** Unique driver ID (MAC address or short form) */
  id: string;

  /** User-editable device name */
  name: string;

  /** Device type */
  type: 'driver' | 'controller';

  /** Unix timestamp of first discovery */
  firstSeen: number;

  /** LED hardware configuration (nested) */
  ledConfig?: DriverConfig;
}

/**
 * Unified driver configuration file structure
 */
interface DriversConfigFile {
  version: string;
  drivers: PersistedDriver[];
}

/**
 * Manages persistent driver data in unified JSON format
 *
 * Responsibilities:
 * - Load/save all driver data from single JSON file
 * - Persist driver discovery (id, name, type, firstSeen)
 * - Persist LED configurations (nested in each driver entry)
 * - Provide drivers to DriverRegistry for runtime tracking
 *
 * What gets persisted: id, name, type, firstSeen, ledConfig
 * What is runtime-only: ip, lastSeen, connected, stats
 */
export class DriverPersistence {
  private configFile: string;
  private drivers = new Map<string, PersistedDriver>();
  private readonly version = '1.0';

  constructor(baseDir = 'config') {
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const parsed = JSON.parse(data);

      // Runtime validation of parsed JSON structure
      if (!parsed || typeof parsed !== 'object') {
        log.error('Invalid drivers config: not a valid object');
        return;
      }

      // Type guard to check if parsed has drivers array
      const config = parsed as Record<string, unknown>;
      if (!config.drivers || !Array.isArray(config.drivers)) {
        log.error('Invalid drivers config: missing or invalid drivers array');
        return;
      }

      const driversConfig = parsed as DriversConfigFile;

      // Load drivers into memory
      for (const driver of driversConfig.drivers) {
        this.drivers.set(driver.id, driver);
      }

      log.info(`Loaded ${this.drivers.size} drivers from ${this.configFile}`);
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
  addDriver(id: string, name: string, type: 'driver' | 'controller' = 'driver'): boolean {
    if (this.drivers.has(id)) {
      return false; // Driver already exists
    }

    const driver: PersistedDriver = {
      id,
      name,
      type,
      firstSeen: Date.now(),
    };

    this.drivers.set(id, driver);
    this.saveConfig();
    log.info(`Added new driver: ${name} (${id})`);
    return true;
  }

  /**
   * Update driver metadata (name, type)
   * Does not update ledConfig - use setDriverLEDConfig for that
   */
  updateDriver(id: string, updates: Partial<Pick<PersistedDriver, 'name' | 'type'>>): boolean {
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
  getDriverLEDConfig(id: string): DriverConfig | undefined {
    return this.drivers.get(id)?.ledConfig;
  }

  /**
   * Set LED configuration for a specific driver
   */
  setDriverLEDConfig(id: string, config: DriverConfig): boolean {
    const driver = this.drivers.get(id);
    if (!driver) {
      log.warn(`Cannot set LED config for non-existent driver: ${id}`);
      return false;
    }

    driver.ledConfig = config;
    this.drivers.set(id, driver);
    this.saveConfig();
    log.info(`Updated LED config for driver ${id}`);
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
