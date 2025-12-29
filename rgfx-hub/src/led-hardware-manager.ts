/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log/main';
import type { LEDHardware } from './types';
import { CONFIG_DIRECTORY } from './config/paths';
import { LEDHardwareSchema } from './schemas';
import { ConfigError, formatZodError } from './errors/config-error';

/**
 * Manages LED hardware definition files
 *
 * Responsibilities:
 * - Load LED hardware definitions from external JSON files
 * - Cache hardware definitions for performance
 * - Validate hardware definition structure
 * - List available hardware definitions
 */
export class LEDHardwareManager {
  private configDir: string;
  private cache = new Map<string, LEDHardware>();

  constructor(baseDir = CONFIG_DIRECTORY) {
    this.configDir = path.resolve(baseDir);
  }

  /**
   * Load LED hardware definition from file.
   * @param hardwareRef - Relative path like "led-hardware/hjhx-8x8-matrix.json"
   * @returns Parsed LEDHardware or null if file doesn't exist
   * @throws ConfigError if file exists but cannot be parsed or validated
   */
  loadHardware(hardwareRef: string): LEDHardware | null {
    // Check cache first
    const cached = this.cache.get(hardwareRef);

    if (cached) {
      log.debug(`LED hardware loaded from cache: ${hardwareRef}`);
      return cached;
    }

    const hardwarePath = path.join(this.configDir, hardwareRef);

    if (!fs.existsSync(hardwarePath)) {
      log.error(`LED hardware file not found: ${hardwarePath}`);
      return null;
    }

    const data = fs.readFileSync(hardwarePath, 'utf8');

    let parsed: unknown;

    try {
      parsed = JSON.parse(data);
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      throw new ConfigError(
        `Failed to parse LED hardware file: ${hardwareRef}`,
        hardwarePath,
        details,
      );
    }

    const parseResult = LEDHardwareSchema.safeParse(parsed);

    if (!parseResult.success) {
      throw new ConfigError(
        `LED hardware file has invalid structure: ${hardwareRef}`,
        hardwarePath,
        formatZodError(parseResult.error),
      );
    }

    const hardware = parseResult.data as LEDHardware;

    // Cache it
    this.cache.set(hardwareRef, hardware);
    const identifier = hardware.asin ?? hardware.sku ?? 'no SKU/ASIN';
    log.info(
      `Loaded LED hardware: ${hardware.name} (${identifier}) from ${hardwareRef} - ${hardware.count} LEDs`,
    );

    return hardware;
  }

  /**
   * Check if a hardware definition file exists
   */
  hasHardware(hardwareRef: string): boolean {
    const hardwarePath = path.join(this.configDir, hardwareRef);
    return fs.existsSync(hardwarePath);
  }

  /**
   * Clear cache (useful for hot-reload)
   */
  clearCache(): void {
    const { size } = this.cache;
    this.cache.clear();
    log.info(`Cleared LED hardware cache (${size} entries)`);
  }

  /**
   * List all available LED hardware definition files in led-hardware directory
   */
  listHardware(): string[] {
    const ledHardwareDir = path.join(this.configDir, 'led-hardware');

    if (!fs.existsSync(ledHardwareDir)) {
      log.warn(`LED hardware directory not found: ${ledHardwareDir}`);
      return [];
    }

    try {
      const files = fs
        .readdirSync(ledHardwareDir)
        .filter((file) => file.endsWith('.json'))
        .map((file) => `led-hardware/${file}`);

      log.info(`Found ${files.length} LED hardware definition files`);
      return files;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`Failed to list LED hardware definitions: ${errorMessage}`);
      return [];
    }
  }
}
