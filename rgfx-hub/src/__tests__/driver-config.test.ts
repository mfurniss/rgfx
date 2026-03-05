import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DriverConfig } from '../driver-config';
import { ConfigError } from '../errors/config-error';

describe('DriverConfig', () => {
  const testConfigDir = path.join(__dirname, '../test-config');
  const testConfigFile = path.join(testConfigDir, 'drivers.json');

  beforeEach(() => {
    // Clean up test directory before each test
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test directory after each test
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true });
    }
  });

  describe('Initialization', () => {
    it('should create config directory if it does not exist', () => {
      expect(fs.existsSync(testConfigDir)).toBe(false);
      new DriverConfig(testConfigDir);
      expect(fs.existsSync(testConfigDir)).toBe(true);
    });

    it('should load existing drivers from config file', () => {
      // Create test config file
      fs.mkdirSync(testConfigDir, { recursive: true });
      const testData = {
        version: '1.0',
        drivers: [
          {
            id: 'rgfx-driver-0001',
            macAddress: 'AA:BB:CC:DD:EE:FF',
          },
          {
            id: 'rgfx-driver-0002',
            macAddress: '11:22:33:44:55:66',
          },
        ],
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(testData, null, 2), 'utf8');

      const persistence = new DriverConfig(testConfigDir);
      persistence.loadConfig();
      const drivers = persistence.getAllDrivers();

      expect(drivers).toHaveLength(2);
      expect(drivers[0].id).toBe('rgfx-driver-0001');
      expect(drivers[1].id).toBe('rgfx-driver-0002');
    });

    it('should handle missing config file gracefully', () => {
      const persistence = new DriverConfig(testConfigDir);
      persistence.loadConfig();
      const drivers = persistence.getAllDrivers();
      expect(drivers).toHaveLength(0);
    });

    it('should throw ConfigError for corrupted JSON file', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      fs.writeFileSync(testConfigFile, 'invalid json {{{', 'utf8');

      const persistence = new DriverConfig(testConfigDir);
      expect(() => {
        persistence.loadConfig();
      }).toThrow(ConfigError);

      try {
        persistence.loadConfig();
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError);
        expect((error as ConfigError).filePath).toBe(testConfigFile);
        expect((error as ConfigError).message).toContain('Failed to parse');
      }
    });
  });

  describe('addDriver', () => {
    it('should add a new driver and persist to disk', () => {
      const persistence = new DriverConfig(testConfigDir);

      const added = persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');

      expect(added).toBe(true);
      expect(persistence.hasDriver('rgfx-driver-0001')).toBe(true);

      // Verify persisted to disk
      const data = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
      expect(data.drivers).toHaveLength(1);
      expect(data.drivers[0].id).toBe('rgfx-driver-0001');
      expect(data.drivers[0].macAddress).toBe('aa:bb:cc:dd:ee:ff');
      expect(data.drivers[0].ledConfig).toBe(null);
    });

    it('should not add duplicate driver', () => {
      const persistence = new DriverConfig(testConfigDir);

      const firstAdd = persistence.addDriver(
        'rgfx-driver-0001',
        'aa:bb:cc:dd:ee:ff',
      );
      const secondAdd = persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');

      expect(firstAdd).toBe(true);
      expect(secondAdd).toBe(false);
      expect(persistence.getAllDrivers()).toHaveLength(1);
    });

    it('should reject invalid driver ID', () => {
      const persistence = new DriverConfig(testConfigDir);

      const added = persistence.addDriver('AA:BB:CC:DD:EE:FF', 'AA:BB:CC:DD:EE:FF');

      expect(added).toBe(false);
      expect(persistence.getAllDrivers()).toHaveLength(0);
    });

    it('should reject invalid MAC address format', () => {
      const persistence = new DriverConfig(testConfigDir);

      const added = persistence.addDriver('rgfx-driver-0001', 'invalid-mac');

      expect(added).toBe(false);
      expect(persistence.getAllDrivers()).toHaveLength(0);
    });
  });

  describe('updateDriver', () => {
    it('should return false for non-existent driver', () => {
      const persistence = new DriverConfig(testConfigDir);

      const updated = persistence.updateDriver('nonexistent', {});

      expect(updated).toBe(false);
    });
  });

  describe('LED Config Management', () => {
    const sampleLEDConfig = {
      hardwareRef: 'led-hardware/test_hardware.json',
      pin: 16,
      offset: 0,
      globalBrightnessLimit: 128,
      dithering: true,
      powerSupplyVolts: 5,
      maxPowerMilliamps: 500,
      gamma: { r: 2.8, g: 2.8, b: 2.8 },
      floor: { r: 0, g: 0, b: 0 },
    };

    it('should set LED config for driver', () => {
      const persistence = new DriverConfig(testConfigDir);
      persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');

      const result = persistence.setLEDConfig('rgfx-driver-0001', sampleLEDConfig);

      expect(result).toBe(true);
      const ledConfig = persistence.getLEDConfig('rgfx-driver-0001');
      expect(ledConfig).toEqual(sampleLEDConfig);
    });

    it('should persist LED config to disk', () => {
      const persistence = new DriverConfig(testConfigDir);
      persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');

      persistence.setLEDConfig('rgfx-driver-0001', sampleLEDConfig);

      const data = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
      expect(data.drivers[0].ledConfig).toEqual(sampleLEDConfig);
    });

    it('should return false when setting LED config for non-existent driver', () => {
      const persistence = new DriverConfig(testConfigDir);

      const result = persistence.setLEDConfig('nonexistent', sampleLEDConfig);

      expect(result).toBe(false);
    });

    it('should return undefined for non-existent driver LED config', () => {
      const persistence = new DriverConfig(testConfigDir);

      const ledConfig = persistence.getLEDConfig('nonexistent');

      expect(ledConfig).toBeUndefined();
    });

    it('should return undefined when driver has no LED config', () => {
      const persistence = new DriverConfig(testConfigDir);
      persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');

      const ledConfig = persistence.getLEDConfig('aa:bb:cc:dd:ee:ff');

      expect(ledConfig).toBeUndefined();
    });
  });

  describe('getDriver', () => {
    it('should return driver by id', () => {
      const persistence = new DriverConfig(testConfigDir);
      persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');

      const driver = persistence.getDriver('rgfx-driver-0001');

      expect(driver).toBeDefined();
      expect(driver!.id).toBe('rgfx-driver-0001');
    });

    it('should return undefined for non-existent driver', () => {
      const persistence = new DriverConfig(testConfigDir);

      const driver = persistence.getDriver('nonexistent');

      expect(driver).toBeUndefined();
    });
  });

  describe('hasDriver', () => {
    it('should return true for existing driver', () => {
      const persistence = new DriverConfig(testConfigDir);
      persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');

      expect(persistence.hasDriver('rgfx-driver-0001')).toBe(true);
    });

    it('should return false for non-existent driver', () => {
      const persistence = new DriverConfig(testConfigDir);

      expect(persistence.hasDriver('nonexistent')).toBe(false);
    });
  });

  describe('deleteDriver', () => {
    it('should delete driver and persist to disk', () => {
      const persistence = new DriverConfig(testConfigDir);
      persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');

      const deleted = persistence.deleteDriver('rgfx-driver-0001');

      expect(deleted).toBe(true);
      expect(persistence.hasDriver('rgfx-driver-0001')).toBe(false);

      const data = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
      expect(data.drivers).toHaveLength(0);
    });

    it('should return false when deleting non-existent driver', () => {
      const persistence = new DriverConfig(testConfigDir);

      const deleted = persistence.deleteDriver('nonexistent');

      expect(deleted).toBe(false);
    });
  });

  describe('getAllDrivers', () => {
    it('should return all drivers', () => {
      const persistence = new DriverConfig(testConfigDir);
      persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');
      persistence.addDriver('rgfx-driver-0002', '11:22:33:44:55:66');

      const drivers = persistence.getAllDrivers();

      expect(drivers).toHaveLength(2);
      expect(drivers.map((d) => d.id)).toContain('rgfx-driver-0001');
      expect(drivers.map((d) => d.id)).toContain('rgfx-driver-0002');
    });

    it('should return empty array when no drivers exist', () => {
      const persistence = new DriverConfig(testConfigDir);

      const drivers = persistence.getAllDrivers();

      expect(drivers).toHaveLength(0);
    });
  });

  describe('Schema Validation on Load', () => {
    it('should throw ConfigError for driver with invalid ID format', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      const testData = {
        version: '1.0',
        drivers: [
          {
            id: 'AA:BB:CC:DD:EE:FF', // Invalid format (MAC address has colons)
            macAddress: 'AA:BB:CC:DD:EE:FF',
          },
        ],
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(testData, null, 2), 'utf8');

      const persistence = new DriverConfig(testConfigDir);
      expect(() => {
        persistence.loadConfig();
      }).toThrow(ConfigError);
    });

    it('should throw ConfigError for driver with invalid MAC address format', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      const testData = {
        version: '1.0',
        drivers: [
          {
            id: 'rgfx-driver-0001',
            macAddress: 'invalid-mac',
          },
        ],
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(testData, null, 2), 'utf8');

      const persistence = new DriverConfig(testConfigDir);
      expect(() => {
        persistence.loadConfig();
      }).toThrow(ConfigError);
    });

    it('should throw ConfigError for driver missing required id field', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      const testData = {
        version: '1.0',
        drivers: [
          {
            // Missing id
            macAddress: 'AA:BB:CC:DD:EE:FF',
          },
        ],
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(testData, null, 2), 'utf8');

      const persistence = new DriverConfig(testConfigDir);
      expect(() => {
        persistence.loadConfig();
      }).toThrow(ConfigError);
    });

    it('should throw ConfigError for driver missing required macAddress field', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      const testData = {
        version: '1.0',
        drivers: [
          {
            id: 'rgfx-driver-0001',
            // Missing macAddress
          },
        ],
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(testData, null, 2), 'utf8');

      const persistence = new DriverConfig(testConfigDir);
      expect(() => {
        persistence.loadConfig();
      }).toThrow(ConfigError);
    });

    it('should throw ConfigError for driver with unrecognized key (strict mode)', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      const testData = {
        version: '1.0',
        drivers: [
          {
            id: 'rgfx-driver-0001',
            macAddress: 'AA:BB:CC:DD:EE:FF',
            unknownField: 'should not be here',
          },
        ],
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(testData, null, 2), 'utf8');

      const persistence = new DriverConfig(testConfigDir);
      expect(() => {
        persistence.loadConfig();
      }).toThrow(ConfigError);

      try {
        persistence.loadConfig();
      } catch (error) {
        expect((error as ConfigError).details).toContain('Unrecognized key');
      }
    });

    it('should throw ConfigError for invalid file structure (missing version)', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      const testData = {
        // Missing version field
        drivers: [
          {
            id: 'rgfx-driver-0001',
            macAddress: 'AA:BB:CC:DD:EE:FF',
          },
        ],
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(testData, null, 2), 'utf8');

      const persistence = new DriverConfig(testConfigDir);
      expect(() => {
        persistence.loadConfig();
      }).toThrow(ConfigError);
    });

    it('should include file path in ConfigError', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      fs.writeFileSync(testConfigFile, 'not valid json', 'utf8');

      const persistence = new DriverConfig(testConfigDir);

      try {
        persistence.loadConfig();
        expect.fail('Should have thrown ConfigError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigError);
        expect((error as ConfigError).filePath).toBe(testConfigFile);
      }
    });

    it('should load all valid drivers when config is correct', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      const testData = {
        version: '1.0',
        drivers: [
          {
            id: 'rgfx-driver-0001',
            macAddress: 'AA:BB:CC:DD:EE:FF',
          },
          {
            id: 'rgfx-driver-0002',
            macAddress: '11:22:33:44:55:66',
          },
          {
            id: 'rgfx-driver-0003',
            macAddress: '22:33:44:55:66:77',
          },
        ],
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(testData, null, 2), 'utf8');

      const persistence = new DriverConfig(testConfigDir);
      persistence.loadConfig();
      const drivers = persistence.getAllDrivers();

      expect(drivers).toHaveLength(3);
      expect(drivers.map((d) => d.id)).toContain('rgfx-driver-0001');
      expect(drivers.map((d) => d.id)).toContain('rgfx-driver-0002');
      expect(drivers.map((d) => d.id)).toContain('rgfx-driver-0003');
    });
  });
});
