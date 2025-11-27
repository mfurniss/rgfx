import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DriverPersistence } from './driver-persistence';

// Mock electron-log
vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DriverPersistence', () => {
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
      new DriverPersistence(testConfigDir);
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

      const persistence = new DriverPersistence(testConfigDir);
      const drivers = persistence.getAllDrivers();

      expect(drivers).toHaveLength(2);
      expect(drivers[0].id).toBe('rgfx-driver-0001');
      expect(drivers[1].id).toBe('rgfx-driver-0002');
    });

    it('should handle missing config file gracefully', () => {
      const persistence = new DriverPersistence(testConfigDir);
      const drivers = persistence.getAllDrivers();
      expect(drivers).toHaveLength(0);
    });

    it('should handle corrupted config file gracefully', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      fs.writeFileSync(testConfigFile, 'invalid json {{{', 'utf8');

      const persistence = new DriverPersistence(testConfigDir);
      const drivers = persistence.getAllDrivers();
      expect(drivers).toHaveLength(0);
    });
  });

  describe('addDriver', () => {
    it('should add a new driver and persist to disk', () => {
      const persistence = new DriverPersistence(testConfigDir);

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
      const persistence = new DriverPersistence(testConfigDir);

      const firstAdd = persistence.addDriver(
        'rgfx-driver-0001',
        'aa:bb:cc:dd:ee:ff'
      );
      const secondAdd = persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');

      expect(firstAdd).toBe(true);
      expect(secondAdd).toBe(false);
      expect(persistence.getAllDrivers()).toHaveLength(1);
    });

    it('should reject invalid driver ID', () => {
      const persistence = new DriverPersistence(testConfigDir);

      const added = persistence.addDriver('AA:BB:CC:DD:EE:FF', 'AA:BB:CC:DD:EE:FF');

      expect(added).toBe(false);
      expect(persistence.getAllDrivers()).toHaveLength(0);
    });

    it('should reject invalid MAC address format', () => {
      const persistence = new DriverPersistence(testConfigDir);

      const added = persistence.addDriver('rgfx-driver-0001', 'invalid-mac');

      expect(added).toBe(false);
      expect(persistence.getAllDrivers()).toHaveLength(0);
    });
  });

  describe('updateDriver', () => {
    it('should return false for non-existent driver', () => {
      const persistence = new DriverPersistence(testConfigDir);

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
      gammaCorrection: 2.5,
      dithering: true,
      powerSupplyVolts: 5,
      maxPowerMilliamps: 500,
    };

    it('should set LED config for driver', () => {
      const persistence = new DriverPersistence(testConfigDir);
      persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');

      const result = persistence.setLEDConfig('rgfx-driver-0001', sampleLEDConfig);

      expect(result).toBe(true);
      const ledConfig = persistence.getLEDConfig('rgfx-driver-0001');
      expect(ledConfig).toEqual(sampleLEDConfig);
    });

    it('should persist LED config to disk', () => {
      const persistence = new DriverPersistence(testConfigDir);
      persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');

      persistence.setLEDConfig('rgfx-driver-0001', sampleLEDConfig);

      const data = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
      expect(data.drivers[0].ledConfig).toEqual(sampleLEDConfig);
    });

    it('should return false when setting LED config for non-existent driver', () => {
      const persistence = new DriverPersistence(testConfigDir);

      const result = persistence.setLEDConfig('nonexistent', sampleLEDConfig);

      expect(result).toBe(false);
    });

    it('should return undefined for non-existent driver LED config', () => {
      const persistence = new DriverPersistence(testConfigDir);

      const ledConfig = persistence.getLEDConfig('nonexistent');

      expect(ledConfig).toBeUndefined();
    });

    it('should return undefined when driver has no LED config', () => {
      const persistence = new DriverPersistence(testConfigDir);
      persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');

      const ledConfig = persistence.getLEDConfig('aa:bb:cc:dd:ee:ff');

      expect(ledConfig).toBeUndefined();
    });
  });

  describe('getDriver', () => {
    it('should return driver by id', () => {
      const persistence = new DriverPersistence(testConfigDir);
      persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');

      const driver = persistence.getDriver('rgfx-driver-0001');

      expect(driver).toBeDefined();
      expect(driver!.id).toBe('rgfx-driver-0001');
    });

    it('should return undefined for non-existent driver', () => {
      const persistence = new DriverPersistence(testConfigDir);

      const driver = persistence.getDriver('nonexistent');

      expect(driver).toBeUndefined();
    });
  });

  describe('hasDriver', () => {
    it('should return true for existing driver', () => {
      const persistence = new DriverPersistence(testConfigDir);
      persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');

      expect(persistence.hasDriver('rgfx-driver-0001')).toBe(true);
    });

    it('should return false for non-existent driver', () => {
      const persistence = new DriverPersistence(testConfigDir);

      expect(persistence.hasDriver('nonexistent')).toBe(false);
    });
  });

  describe('deleteDriver', () => {
    it('should delete driver and persist to disk', () => {
      const persistence = new DriverPersistence(testConfigDir);
      persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');

      const deleted = persistence.deleteDriver('rgfx-driver-0001');

      expect(deleted).toBe(true);
      expect(persistence.hasDriver('rgfx-driver-0001')).toBe(false);

      const data = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
      expect(data.drivers).toHaveLength(0);
    });

    it('should return false when deleting non-existent driver', () => {
      const persistence = new DriverPersistence(testConfigDir);

      const deleted = persistence.deleteDriver('nonexistent');

      expect(deleted).toBe(false);
    });
  });

  describe('getAllDrivers', () => {
    it('should return all drivers', () => {
      const persistence = new DriverPersistence(testConfigDir);
      persistence.addDriver('rgfx-driver-0001', 'aa:bb:cc:dd:ee:ff');
      persistence.addDriver('rgfx-driver-0002', '11:22:33:44:55:66');

      const drivers = persistence.getAllDrivers();

      expect(drivers).toHaveLength(2);
      expect(drivers.map((d) => d.id)).toContain('rgfx-driver-0001');
      expect(drivers.map((d) => d.id)).toContain('rgfx-driver-0002');
    });

    it('should return empty array when no drivers exist', () => {
      const persistence = new DriverPersistence(testConfigDir);

      const drivers = persistence.getAllDrivers();

      expect(drivers).toHaveLength(0);
    });
  });

  describe('Schema Validation on Load', () => {
    it('should skip drivers with invalid ID format', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      const testData = {
        version: '1.0',
        drivers: [
          {
            id: 'AA:BB:CC:DD:EE:FF', // Invalid format (MAC address)
            macAddress: 'AA:BB:CC:DD:EE:FF',
          },
          {
            id: 'rgfx-driver-0001',
            macAddress: '11:22:33:44:55:66',
          },
        ],
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(testData, null, 2), 'utf8');

      const persistence = new DriverPersistence(testConfigDir);
      const drivers = persistence.getAllDrivers();

      expect(drivers).toHaveLength(1);
      expect(drivers[0].id).toBe('rgfx-driver-0001');
    });

    it('should skip drivers with invalid MAC address format', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      const testData = {
        version: '1.0',
        drivers: [
          {
            id: 'rgfx-driver-0001',
            macAddress: 'invalid-mac',
          },
          {
            id: 'rgfx-driver-0002',
            macAddress: '11:22:33:44:55:66',
          },
        ],
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(testData, null, 2), 'utf8');

      const persistence = new DriverPersistence(testConfigDir);
      const drivers = persistence.getAllDrivers();

      expect(drivers).toHaveLength(1);
      expect(drivers[0].id).toBe('rgfx-driver-0002');
    });

    it('should skip drivers missing required fields', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      const testData = {
        version: '1.0',
        drivers: [
          {
            // Missing id
            macAddress: 'AA:BB:CC:DD:EE:FF',
          },
          {
            id: 'rgfx-driver-0001',
            // Missing macAddress
          },
          {
            id: 'rgfx-driver-0002',
            macAddress: '11:22:33:44:55:66',
          },
        ],
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(testData, null, 2), 'utf8');

      const persistence = new DriverPersistence(testConfigDir);
      const drivers = persistence.getAllDrivers();

      expect(drivers).toHaveLength(1);
      expect(drivers[0].id).toBe('rgfx-driver-0002');
    });

    it('should load all valid drivers and skip all invalid ones', () => {
      fs.mkdirSync(testConfigDir, { recursive: true });
      const testData = {
        version: '1.0',
        drivers: [
          {
            id: 'invalid-mac-format',
            macAddress: 'not-a-mac',
          },
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

      const persistence = new DriverPersistence(testConfigDir);
      const drivers = persistence.getAllDrivers();

      expect(drivers).toHaveLength(3);
      expect(drivers.map((d) => d.id)).toContain('rgfx-driver-0001');
      expect(drivers.map((d) => d.id)).toContain('rgfx-driver-0002');
      expect(drivers.map((d) => d.id)).toContain('rgfx-driver-0003');
    });
  });
});
