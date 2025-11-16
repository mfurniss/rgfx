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

/**
 * Persisted driver data structure
 * Stores static configuration and metadata, excludes runtime state
 */
export interface PersistedDriver {
  /** Unique driver ID (sequential format: rgfx-driver-0001) */
  id: string;

  /** Original MAC address for reference and MQTT communication */
  macAddress: string;

  /** User-editable device name */
  name: string;

  /** Optional user-editable description */
  description?: string;

  /** Unix timestamp of first discovery */
  firstSeen: number;

  /** LED configuration (hardware reference + settings) */
  ledConfig?: DriverLEDConfig | null;
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

      // Validate version
      if (typeof config.version !== 'string' || config.version.length === 0) {
        log.error('Invalid drivers config: missing or invalid version');
        return;
      }

      const driversConfig = parsed as DriversConfigFile;

      // Validate each driver entry against schema
      let validCount = 0;
      for (const driver of driversConfig.drivers) {
        if (this.validateDriverEntry(driver)) {
          this.drivers.set(driver.id, driver);
          validCount++;
        } else {
          log.error(`Skipping invalid driver entry: ${JSON.stringify(driver)}`);
        }
      }

      log.info(`Loaded ${validCount} valid drivers from ${this.configFile} (${driversConfig.drivers.length - validCount} invalid entries skipped)`);
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
   * Validate driver ID format
   * Max 32 characters, alphanumeric + hyphens only
   */
  private validateDriverId(id: string): boolean {
    if (id.length === 0 || id.length > 32) {
      return false;
    }
    return /^[a-z0-9-]+$/i.test(id);
  }

  /**
   * Validate driver name format
   * Max 64 characters, printable characters only
   */
  private validateDriverName(name: string): boolean {
    if (name.length === 0 || name.length > 64) {
      return false;
    }
    // Allow alphanumeric, spaces, hyphens, underscores, and common punctuation
    return /^[\w\s\-_.()]+$/i.test(name);
  }

  /**
   * Validate a single driver entry against schema
   */
  private validateDriverEntry(driver: unknown): driver is PersistedDriver {
    if (!driver || typeof driver !== 'object') {
      return false;
    }

    const d = driver as Record<string, unknown>;

    // Required fields
    if (typeof d.id !== 'string' || !this.validateDriverId(d.id)) {
      log.error(`Invalid driver ID: ${String(d.id)}`);
      return false;
    }

    if (typeof d.macAddress !== 'string' || !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(d.macAddress)) {
      log.error(`Invalid MAC address for driver ${d.id}: ${String(d.macAddress)}`);
      return false;
    }

    if (typeof d.name !== 'string' || !this.validateDriverName(d.name)) {
      log.error(`Invalid driver name for driver ${d.id}: ${String(d.name)}`);
      return false;
    }

    if (typeof d.firstSeen !== 'number' || d.firstSeen <= 0) {
      log.error(`Invalid firstSeen timestamp for driver ${d.id}: ${String(d.firstSeen)}`);
      return false;
    }

    // Optional fields
    if (d.description !== undefined && typeof d.description !== 'string') {
      log.error(`Invalid description for driver ${d.id}: must be string`);
      return false;
    }

    if (d.ledConfig !== undefined && d.ledConfig !== null && typeof d.ledConfig !== 'object') {
      log.error(`Invalid ledConfig for driver ${d.id}: must be object or null`);
      return false;
    }

    return true;
  }

  /**
   * Add a newly discovered driver
   * Returns true if driver was added, false if it already exists
   */
  addDriver(id: string, macAddress: string, name: string): boolean {
    if (!this.validateDriverId(id)) {
      log.error(`Invalid driver ID format: ${id}`);
      return false;
    }

    if (!this.validateDriverName(name)) {
      log.error(`Invalid driver name format: ${name}`);
      return false;
    }

    if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(macAddress)) {
      log.error(`Invalid MAC address format: ${macAddress}`);
      return false;
    }

    if (this.drivers.has(id)) {
      return false; // Driver already exists
    }

    const driver: PersistedDriver = {
      id,
      macAddress,
      name,
      firstSeen: Date.now(),
      ledConfig: null,
    };

    this.drivers.set(id, driver);
    this.saveConfig();
    log.info(`Added new driver: ${name} (${id}, MAC: ${macAddress})`);
    return true;
  }

  /**
   * Update driver metadata (name, description)
   * Does not update ledConfig - use setDriverLEDConfig for that
   */
  updateDriver(
    id: string,
    updates: Partial<Pick<PersistedDriver, 'name' | 'description'>>
  ): boolean {
    const driver = this.drivers.get(id);
    if (!driver) {
      log.warn(`Cannot update non-existent driver: ${id}`);
      return false;
    }

    // Validate name if it's being updated
    if (updates.name !== undefined && !this.validateDriverName(updates.name)) {
      log.error(`Invalid driver name format: ${updates.name}`);
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
