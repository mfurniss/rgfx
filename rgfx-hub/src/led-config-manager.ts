/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log/main';
import type { DriverConfig } from './types';

/**
 * Manages LED hardware configuration files
 *
 * Responsibilities:
 * - Load LED configs from external JSON files
 * - Cache configs for performance
 * - Validate config structure
 * - List available configurations
 */
export class LEDConfigManager {
  private configDir: string;
  private cache = new Map<string, DriverConfig>();

  constructor(baseDir = 'config') {
    this.configDir = path.resolve(baseDir);
  }

  /**
   * Load LED configuration from file
   * @param configRef - Relative path like "led-configs/8x8-matrix.json"
   * @returns Parsed DriverConfig or null if not found/invalid
   */
  loadConfig(configRef: string): DriverConfig | null {
    // Check cache first
    const cached = this.cache.get(configRef);
    if (cached) {
      log.debug(`LED config loaded from cache: ${configRef}`);
      return cached;
    }

    const configPath = path.join(this.configDir, configRef);

    if (!fs.existsSync(configPath)) {
      log.error(`LED config file not found: ${configPath}`);
      return null;
    }

    try {
      const data = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(data) as DriverConfig;

      // Validate
      if (!config.name) {
        log.error(`Invalid LED config in ${configPath}: missing name`);
        return null;
      }

      if (config.led_devices.length === 0) {
        log.error(`Invalid LED config in ${configPath}: no led_devices`);
        return null;
      }

      // Cache it
      this.cache.set(configRef, config);
      log.info(`Loaded LED config: ${config.name} from ${configRef} (${config.led_devices.length} devices)`);

      return config;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Failed to load LED config from ${configPath}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Check if a config file exists
   */
  hasConfig(configRef: string): boolean {
    const configPath = path.join(this.configDir, configRef);
    return fs.existsSync(configPath);
  }

  /**
   * Clear cache (useful for hot-reload)
   */
  clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    log.info(`Cleared LED config cache (${size} entries)`);
  }

  /**
   * List all available LED config files in led-configs directory
   */
  listConfigs(): string[] {
    const ledConfigsDir = path.join(this.configDir, 'led-configs');

    if (!fs.existsSync(ledConfigsDir)) {
      log.warn(`LED configs directory not found: ${ledConfigsDir}`);
      return [];
    }

    try {
      const files = fs.readdirSync(ledConfigsDir)
        .filter(file => file.endsWith('.json'))
        .map(file => `led-configs/${file}`);

      log.info(`Found ${files.length} LED config files`);
      return files;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Failed to list LED configs: ${errorMessage}`);
      return [];
    }
  }
}
