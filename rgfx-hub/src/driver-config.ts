import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log/main';
import type { DriverLEDConfig } from './types';
import { CONFIG_VERSION } from './config/constants';
import { CONFIG_DIRECTORY } from './config/paths';
import {
  ConfiguredDriverSchema,
  DriversConfigFileRawSchema,
  type ConfiguredDriverFromSchema,
  type DriversConfigFile,
} from './schemas';
import { ConfigError, formatZodError } from './errors/config-error';
import { getErrorMessage } from './utils/driver-utils';

/**
 * Re-export the Zod-inferred type as ConfiguredDriver for external use
 */
export type ConfiguredDriver = ConfiguredDriverFromSchema;

/**
 * Manages driver configuration in unified JSON format
 *
 * Responsibilities:
 * - Load/save all driver config from single JSON file
 * - Store driver identity (id, macAddress, description)
 * - Store LED configurations (nested in each driver entry)
 * - Provide driver configs to DriverRegistry for runtime matching
 *
 * What is stored: id, macAddress, description, ledConfig
 * What is runtime-only: ip, lastSeen, connected, stats
 */
export class DriverConfig {
  private configFile: string;
  private drivers = new Map<string, ConfiguredDriver>();
  private readonly version = CONFIG_VERSION;

  constructor(baseDir = CONFIG_DIRECTORY) {
    this.configFile = path.resolve(baseDir, 'drivers.json');

    // Ensure config directory exists
    this.ensureDirectory(baseDir);
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
   * Load all drivers from unified config file.
   * Throws ConfigError if file exists but cannot be parsed or validated.
   */
  loadConfig(): void {
    if (!fs.existsSync(this.configFile)) {
      log.info(`No existing drivers config found at ${this.configFile} - starting fresh`);
      return;
    }

    const data = fs.readFileSync(this.configFile, 'utf8');

    let parsed: unknown;

    try {
      parsed = JSON.parse(data);
    } catch (error) {
      throw new ConfigError(
        'Failed to parse driver configuration file',
        this.configFile,
        getErrorMessage(error),
      );
    }

    // Validate config file structure (version + drivers array exists)
    const result = DriversConfigFileRawSchema.safeParse(parsed);

    if (!result.success) {
      throw new ConfigError(
        'Driver configuration file has invalid structure',
        this.configFile,
        formatZodError(result.error),
      );
    }

    // Validate each driver entry - any invalid entry is a critical error
    for (const driver of result.data.drivers) {
      const driverResult = ConfiguredDriverSchema.safeParse(driver);

      if (driverResult.success) {
        this.drivers.set(driverResult.data.id, driverResult.data);
      } else {
        throw new ConfigError(
          'Driver configuration file contains invalid driver entry',
          this.configFile,
          formatZodError(driverResult.error),
        );
      }
    }

    log.info(`Loaded ${this.drivers.size} drivers from ${this.configFile}`);
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
      log.error(`Failed to save drivers config: ${getErrorMessage(error)}`);
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
    const result = ConfiguredDriverSchema.safeParse(driver);

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
  updateDriver(id: string, updates: Partial<Pick<ConfiguredDriver, 'description'>>): boolean {
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
   * Set remote logging level for a specific driver
   */
  setRemoteLogging(id: string, level: ConfiguredDriver['remoteLogging']): boolean {
    const driver = this.drivers.get(id);

    if (!driver) {
      log.warn(`Cannot set remote logging for non-existent driver: ${id}`);
      return false;
    }

    driver.remoteLogging = level;
    this.drivers.set(id, driver);
    this.saveConfig();
    log.info(`Set remote logging for driver ${id}: ${level}`);
    return true;
  }

  /**
   * Set disabled state for a specific driver
   */
  setDisabled(id: string, disabled: boolean): boolean {
    const driver = this.drivers.get(id);

    if (!driver) {
      log.warn(`Cannot set disabled state for non-existent driver: ${id}`);
      return false;
    }

    driver.disabled = disabled;
    this.drivers.set(id, driver);
    this.saveConfig();
    log.info(`Set disabled state for driver ${id}: ${disabled}`);
    return true;
  }

  /**
   * Check if a driver is disabled
   */
  isDisabled(id: string): boolean {
    return this.drivers.get(id)?.disabled ?? false;
  }

  /**
   * Check if a driver is disabled by MAC address
   */
  isDisabledByMac(macAddress: string): boolean {
    return this.getDriverByMac(macAddress)?.disabled ?? false;
  }

  /**
   * Get all known drivers (for UI and DriverRegistry initialization)
   */
  getAllDrivers(): ConfiguredDriver[] {
    return Array.from(this.drivers.values());
  }

  /**
   * Get a specific driver by ID
   */
  getDriver(id: string): ConfiguredDriver | undefined {
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
  getDriverByMac(macAddress: string): ConfiguredDriver | undefined {
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
