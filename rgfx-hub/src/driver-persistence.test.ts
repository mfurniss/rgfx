import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { DriverPersistence } from './driver-persistence';
import type { DriverConfig } from './types/driver-config';

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
            id: 'aa:bb:cc:dd:ee:ff',
            name: 'Test Driver 1',
            type: 'driver' as const,
            firstSeen: 1234567890,
          },
          {
            id: '11:22:33:44:55:66',
            name: 'Test Driver 2',
            type: 'controller' as const,
            firstSeen: 9876543210,
          },
        ],
      };
      fs.writeFileSync(testConfigFile, JSON.stringify(testData, null, 2), 'utf8');

      const persistence = new DriverPersistence(testConfigDir);
      const drivers = persistence.getAllDrivers();

      expect(drivers).toHaveLength(2);
      expect(drivers[0].id).toBe('aa:bb:cc:dd:ee:ff');
      expect(drivers[0].name).toBe('Test Driver 1');
      expect(drivers[1].id).toBe('11:22:33:44:55:66');
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

      const added = persistence.addDriver('aa:bb:cc:dd:ee:ff', 'Test Driver', 'driver');

      expect(added).toBe(true);
      expect(persistence.hasDriver('aa:bb:cc:dd:ee:ff')).toBe(true);

      // Verify persisted to disk
      const data = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
      expect(data.drivers).toHaveLength(1);
      expect(data.drivers[0].id).toBe('aa:bb:cc:dd:ee:ff');
      expect(data.drivers[0].name).toBe('Test Driver');
    });

    it('should not add duplicate driver', () => {
      const persistence = new DriverPersistence(testConfigDir);

      const firstAdd = persistence.addDriver('aa:bb:cc:dd:ee:ff', 'Test Driver', 'driver');
      const secondAdd = persistence.addDriver('aa:bb:cc:dd:ee:ff', 'Duplicate', 'driver');

      expect(firstAdd).toBe(true);
      expect(secondAdd).toBe(false);
      expect(persistence.getAllDrivers()).toHaveLength(1);
    });

    it('should set firstSeen timestamp', () => {
      const now = Date.now();
      const persistence = new DriverPersistence(testConfigDir);

      persistence.addDriver('aa:bb:cc:dd:ee:ff', 'Test Driver', 'driver');

      const driver = persistence.getDriver('aa:bb:cc:dd:ee:ff');
      expect(driver).toBeDefined();
      expect(driver!.firstSeen).toBeGreaterThanOrEqual(now);
      expect(driver!.firstSeen).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('updateDriver', () => {
    it('should update driver name', () => {
      const persistence = new DriverPersistence(testConfigDir);
      persistence.addDriver('aa:bb:cc:dd:ee:ff', 'Old Name', 'driver');

      const updated = persistence.updateDriver('aa:bb:cc:dd:ee:ff', { name: 'New Name' });

      expect(updated).toBe(true);
      const driver = persistence.getDriver('aa:bb:cc:dd:ee:ff');
      expect(driver!.name).toBe('New Name');
    });

    it('should update driver type', () => {
      const persistence = new DriverPersistence(testConfigDir);
      persistence.addDriver('aa:bb:cc:dd:ee:ff', 'Test Driver', 'driver');

      persistence.updateDriver('aa:bb:cc:dd:ee:ff', { type: 'controller' });

      const driver = persistence.getDriver('aa:bb:cc:dd:ee:ff');
      expect(driver!.type).toBe('controller');
    });

    it('should return false for non-existent driver', () => {
      const persistence = new DriverPersistence(testConfigDir);

      const updated = persistence.updateDriver('nonexistent', { name: 'New Name' });

      expect(updated).toBe(false);
    });

    it('should persist updates to disk', () => {
      const persistence = new DriverPersistence(testConfigDir);
      persistence.addDriver('aa:bb:cc:dd:ee:ff', 'Old Name', 'driver');

      persistence.updateDriver('aa:bb:cc:dd:ee:ff', { name: 'New Name' });

      const data = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
      expect(data.drivers[0].name).toBe('New Name');
    });
  });

  describe('LED Config Management', () => {
    const sampleLEDConfig: DriverConfig = {
      driver_id: 'aa:bb:cc:dd:ee:ff',
      version: '1.0',
      friendly_name: 'Test LED Config',
      led_devices: [
        {
          id: 'strip1',
          name: 'LED Strip 1',
          pin: 16,
          type: 'strip',
          count: 100,
          chipset: 'WS2812B',
          color_order: 'GRB',
        },
      ],
      settings: {
        global_brightness_limit: 200,
      },
    };

    it('should set LED config for driver', () => {
      const persistence = new DriverPersistence(testConfigDir);
      persistence.addDriver('aa:bb:cc:dd:ee:ff', 'Test Driver', 'driver');

      const result = persistence.setDriverLEDConfig('aa:bb:cc:dd:ee:ff', sampleLEDConfig);

      expect(result).toBe(true);
      const config = persistence.getDriverLEDConfig('aa:bb:cc:dd:ee:ff');
      expect(config).toEqual(sampleLEDConfig);
    });

    it('should persist LED config to disk', () => {
      const persistence = new DriverPersistence(testConfigDir);
      persistence.addDriver('aa:bb:cc:dd:ee:ff', 'Test Driver', 'driver');

      persistence.setDriverLEDConfig('aa:bb:cc:dd:ee:ff', sampleLEDConfig);

      const data = JSON.parse(fs.readFileSync(testConfigFile, 'utf8'));
      expect(data.drivers[0].ledConfig).toEqual(sampleLEDConfig);
    });

    it('should return false when setting LED config for non-existent driver', () => {
      const persistence = new DriverPersistence(testConfigDir);

      const result = persistence.setDriverLEDConfig('nonexistent', sampleLEDConfig);

      expect(result).toBe(false);
    });

    it('should return undefined for non-existent driver LED config', () => {
      const persistence = new DriverPersistence(testConfigDir);

      const config = persistence.getDriverLEDConfig('nonexistent');

      expect(config).toBeUndefined();
    });

    it('should return undefined when driver has no LED config', () => {
      const persistence = new DriverPersistence(testConfigDir);
      persistence.addDriver('aa:bb:cc:dd:ee:ff', 'Test Driver', 'driver');

      const config = persistence.getDriverLEDConfig('aa:bb:cc:dd:ee:ff');

      expect(config).toBeUndefined();
    });
  });

  describe('getDriver', () => {
    it('should return driver by id', () => {
      const persistence = new DriverPersistence(testConfigDir);
      persistence.addDriver('aa:bb:cc:dd:ee:ff', 'Test Driver', 'driver');

      const driver = persistence.getDriver('aa:bb:cc:dd:ee:ff');

      expect(driver).toBeDefined();
      expect(driver!.id).toBe('aa:bb:cc:dd:ee:ff');
      expect(driver!.name).toBe('Test Driver');
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
      persistence.addDriver('aa:bb:cc:dd:ee:ff', 'Test Driver', 'driver');

      expect(persistence.hasDriver('aa:bb:cc:dd:ee:ff')).toBe(true);
    });

    it('should return false for non-existent driver', () => {
      const persistence = new DriverPersistence(testConfigDir);

      expect(persistence.hasDriver('nonexistent')).toBe(false);
    });
  });

  describe('deleteDriver', () => {
    it('should delete driver and persist to disk', () => {
      const persistence = new DriverPersistence(testConfigDir);
      persistence.addDriver('aa:bb:cc:dd:ee:ff', 'Test Driver', 'driver');

      const deleted = persistence.deleteDriver('aa:bb:cc:dd:ee:ff');

      expect(deleted).toBe(true);
      expect(persistence.hasDriver('aa:bb:cc:dd:ee:ff')).toBe(false);

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
      persistence.addDriver('aa:bb:cc:dd:ee:ff', 'Driver 1', 'driver');
      persistence.addDriver('11:22:33:44:55:66', 'Driver 2', 'controller');

      const drivers = persistence.getAllDrivers();

      expect(drivers).toHaveLength(2);
      expect(drivers.map(d => d.id)).toContain('aa:bb:cc:dd:ee:ff');
      expect(drivers.map(d => d.id)).toContain('11:22:33:44:55:66');
    });

    it('should return empty array when no drivers exist', () => {
      const persistence = new DriverPersistence(testConfigDir);

      const drivers = persistence.getAllDrivers();

      expect(drivers).toHaveLength(0);
    });
  });
});
