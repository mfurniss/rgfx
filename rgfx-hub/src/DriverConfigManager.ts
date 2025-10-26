import * as fs from 'fs';
import * as path from 'path';
import type { DriverConfig, ValidationResult } from './types/DriverConfig';
import log from 'electron-log/main';

/**
 * Manages driver hardware configurations
 *
 * Responsibilities:
 * - Load/save driver configs from JSON files
 * - Validate configuration structure
 * - Create configs from templates for new drivers
 * - Track configuration changes
 */
export class DriverConfigManager {
  private configDir: string;
  private templateDir: string;
  private configs = new Map<string, DriverConfig>();

  constructor(baseDir = 'config/drivers') {
    this.configDir = path.resolve(baseDir);
    this.templateDir = path.join(this.configDir, 'templates');

    // Ensure directories exist
    this.ensureDirectories();

    // Load all existing configs
    this.loadAllConfigs();
  }

  /**
   * Ensure config directories exist
   */
  private ensureDirectories(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
      log.info(`Created config directory: ${this.configDir}`);
    }

    if (!fs.existsSync(this.templateDir)) {
      fs.mkdirSync(this.templateDir, { recursive: true });
      log.info(`Created template directory: ${this.templateDir}`);
    }
  }

  /**
   * Load all driver configurations from disk
   */
  private loadAllConfigs(): void {
    if (!fs.existsSync(this.configDir)) {
      return;
    }

    const files = fs.readdirSync(this.configDir);

    for (const file of files) {
      if (!file.endsWith('.json') || file.startsWith('.')) {
        continue;
      }

      const filepath = path.join(this.configDir, file);
      const stat = fs.statSync(filepath);

      if (stat.isFile()) {
        try {
          const config = this.loadConfig(filepath);
          if (config) {
            this.configs.set(config.driver_id, config);
            log.info(`Loaded config for driver: ${config.driver_id} (${config.friendly_name ?? 'unnamed'})`);
          }
        } catch (error) {
          log.error(`Failed to load config ${file}:`, error);
        }
      }
    }

    log.info(`Loaded ${this.configs.size} driver configurations`);
  }

  /**
   * Load a single driver configuration from file
   */
  private loadConfig(filepath: string): DriverConfig | null {
    try {
      const data = fs.readFileSync(filepath, 'utf8');
      const config = JSON.parse(data) as DriverConfig;

      // Validate config
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        log.error(`Invalid config in ${filepath}:`, validation.errors);
        return null;
      }

      return config;
    } catch (error) {
      log.error(`Error loading config from ${filepath}:`, error);
      return null;
    }
  }

  /**
   * Get configuration for a specific driver
   * Returns null if no config exists - does NOT auto-create
   */
  getConfig(driverId: string): DriverConfig | null {
    return this.configs.get(driverId) ?? null;
  }

  /**
   * Check if a driver has a valid configuration file
   */
  hasConfig(driverId: string): boolean {
    return this.configs.has(driverId);
  }

  /**
   * Create a new driver config from the default template
   * For UI use - allows user to start with template and customize
   */
  createConfigFromTemplate(driverId: string, templateName = 'default'): DriverConfig {
    const templatePath = path.join(this.templateDir, `${templateName}.json`);

    let template: DriverConfig;
    if (fs.existsSync(templatePath)) {
      const data = fs.readFileSync(templatePath, 'utf8');
      template = JSON.parse(data) as DriverConfig;
    } else {
      // Fallback to minimal config if template doesn't exist
      template = {
        driver_id: 'TEMPLATE',
        version: '1.0',
        led_devices: [
          {
            id: 'strip1',
            name: 'LED Strip 1',
            pin: 16,
            type: 'strip',
            count: 100,
            offset: 0,
            chipset: 'WS2812B',
            color_order: 'GRB',
            max_brightness: 255
          }
        ],
        settings: {
          global_brightness_limit: 255,
          gamma_correction: 2.2,
          dithering: true,
          update_rate: 60
        }
      };
    }

    // Customize template for this driver
    return {
      ...template,
      driver_id: driverId,
      friendly_name: `Driver ${driverId.slice(-8)}`,
      description: 'Auto-generated configuration'
    };
  }

  /**
   * Save driver configuration to disk
   */
  saveConfig(config: DriverConfig): void {
    // Validate before saving
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
    }

    const filepath = path.join(this.configDir, `${config.driver_id}.json`);

    try {
      fs.writeFileSync(filepath, JSON.stringify(config, null, 2), 'utf8');
      this.configs.set(config.driver_id, config);
      log.info(`Saved config for driver: ${config.driver_id}`);
    } catch (error) {
      log.error(`Failed to save config for ${config.driver_id}:`, error);
      throw error;
    }
  }

  /**
   * Update driver configuration
   * If config doesn't exist, creates from template first
   */
  updateConfig(driverId: string, updates: Partial<DriverConfig>): DriverConfig {
    // If no config exists, create from template
    const config = this.getConfig(driverId) ?? this.createConfigFromTemplate(driverId);

    const updated = { ...config, ...updates, driver_id: driverId };
    this.saveConfig(updated);
    return updated;
  }

  /**
   * Delete driver configuration
   */
  deleteConfig(driverId: string): void {
    const filepath = path.join(this.configDir, `${driverId}.json`);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      this.configs.delete(driverId);
      log.info(`Deleted config for driver: ${driverId}`);
    }
  }

  /**
   * Get all driver configurations
   */
  getAllConfigs(): DriverConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Validate driver configuration
   * Accepts unknown data type since we're validating potentially malformed JSON
   */
  validateConfig(config: unknown): ValidationResult {
    const errors: string[] = [];

    // Type guard - ensure config is an object
    if (!config || typeof config !== 'object') {
      errors.push('Configuration must be an object');
      return { valid: false, errors };
    }

    const cfg = config as Record<string, unknown>;

    // Required fields
    if (!cfg.driver_id || typeof cfg.driver_id !== 'string') {
      errors.push('driver_id is required and must be a string');
    }

    if (!cfg.version || typeof cfg.version !== 'string') {
      errors.push('version is required and must be a string');
    }

    if (!cfg.led_devices || !Array.isArray(cfg.led_devices) || cfg.led_devices.length === 0) {
      errors.push('At least one LED device is required');
    }

    // Validate LED devices
    if (cfg.led_devices && Array.isArray(cfg.led_devices)) {
      const deviceIds = new Set<string>();

      for (let i = 0; i < cfg.led_devices.length; i++) {
        const device = cfg.led_devices[i] as Record<string, unknown>;
        const prefix = `led_devices[${i}]`;

        // Required fields
        if (!device.id || typeof device.id !== 'string') {
          errors.push(`${prefix}.id is required and must be a string`);
        } else {
          // Check for duplicate IDs
          if (deviceIds.has(device.id)) {
            errors.push(`${prefix}.id "${device.id}" is duplicated`);
          }
          deviceIds.add(device.id);

          // Validate ID format (lowercase alphanumeric + underscore)
          if (!/^[a-z0-9_]+$/.test(device.id)) {
            errors.push(`${prefix}.id "${device.id}" must be lowercase alphanumeric with underscores`);
          }
        }

        if (!device.name || typeof device.name !== 'string') {
          errors.push(`${prefix}.name is required and must be a string`);
        }

        if (device.pin === undefined || typeof device.pin !== 'number') {
          errors.push(`${prefix}.pin is required and must be a number`);
        } else if (device.pin < 0 || device.pin > 39) {
          errors.push(`${prefix}.pin must be between 0 and 39`);
        }

        if (!device.type || typeof device.type !== 'string') {
          errors.push(`${prefix}.type is required and must be a string`);
        } else if (device.type !== 'strip' && device.type !== 'matrix') {
          errors.push(`${prefix}.type must be "strip" or "matrix"`);
        }

        if (!device.count || typeof device.count !== 'number' || device.count < 1) {
          errors.push(`${prefix}.count must be a number >= 1`);
        }

        // Matrix validation
        if (device.type === 'matrix') {
          if (!device.width || typeof device.width !== 'number' || device.width < 1) {
            errors.push(`${prefix}.width is required for matrix devices and must be >= 1`);
          }
          if (!device.height || typeof device.height !== 'number' || device.height < 1) {
            errors.push(`${prefix}.height is required for matrix devices and must be >= 1`);
          }
          if (typeof device.width === 'number' && typeof device.height === 'number' && typeof device.count === 'number' && device.count !== device.width * device.height) {
            errors.push(`${prefix}.count (${device.count}) must equal width * height (${device.width * device.height})`);
          }
        }

        // Brightness validation
        if (device.max_brightness !== undefined) {
          if (typeof device.max_brightness !== 'number' || device.max_brightness < 0 || device.max_brightness > 255) {
            errors.push(`${prefix}.max_brightness must be a number between 0 and 255`);
          }
        }

        // SPI data rate validation (only for SPI chipsets)
        if (device.data_rate_mhz !== undefined) {
          const spiChipsets = ['APA102', 'SK9822'];
          if (typeof device.chipset === 'string' && !spiChipsets.includes(device.chipset)) {
            errors.push(`${prefix}.data_rate_mhz can only be used with SPI chipsets (APA102, SK9822)`);
          }
          if (typeof device.data_rate_mhz !== 'number' || device.data_rate_mhz < 1 || device.data_rate_mhz > 40) {
            errors.push(`${prefix}.data_rate_mhz must be a number between 1 and 40`);
          }
        }
      }
    }

    // Validate settings
    if (cfg.settings && typeof cfg.settings === 'object') {
      const s = cfg.settings as Record<string, unknown>;

      if (s.global_brightness_limit !== undefined) {
        if (typeof s.global_brightness_limit !== 'number' || s.global_brightness_limit < 0 || s.global_brightness_limit > 255) {
          errors.push('settings.global_brightness_limit must be a number between 0 and 255');
        }
      }

      if (s.gamma_correction !== undefined) {
        if (typeof s.gamma_correction !== 'number' || s.gamma_correction < 1.0 || s.gamma_correction > 3.0) {
          errors.push('settings.gamma_correction must be a number between 1.0 and 3.0');
        }
      }

      if (s.update_rate !== undefined) {
        if (typeof s.update_rate !== 'number' || s.update_rate < 30 || s.update_rate > 120) {
          errors.push('settings.update_rate must be a number between 30 and 120');
        }
      }

      if (s.power_supply_volts !== undefined) {
        if (typeof s.power_supply_volts !== 'number' || s.power_supply_volts <= 0 || s.power_supply_volts > 24) {
          errors.push('settings.power_supply_volts must be a number between 0 and 24');
        }
      }

      if (s.max_power_milliamps !== undefined) {
        if (typeof s.max_power_milliamps !== 'number' || s.max_power_milliamps <= 0) {
          errors.push('settings.max_power_milliamps must be a number greater than 0');
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Export config as JSON string
   */
  exportConfig(driverId: string): string {
    const config = this.getConfig(driverId);
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import config from JSON string
   */
  importConfig(jsonString: string): DriverConfig {
    const config = JSON.parse(jsonString) as DriverConfig;
    const validation = this.validateConfig(config);

    if (!validation.valid) {
      throw new Error(`Invalid config: ${validation.errors.join(', ')}`);
    }

    this.saveConfig(config);
    return config;
  }
}
