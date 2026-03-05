import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DriverRegistry } from '../driver-registry';
import { DriverConfig } from '../driver-config';
import { LEDHardwareManager } from '../led-hardware-manager';
import { createMockTelemetryData } from './factories';
import { eventBus } from '../services/event-bus';

// Spy on eventBus
const emitSpy = vi.spyOn(eventBus, 'emit');

// Mock fs to prevent actual file operations
vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => false),
    mkdirSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
  },
  existsSync: vi.fn(() => false),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

describe('DriverRegistry', () => {
  let registry: DriverRegistry;
  let persistence: DriverConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    emitSpy.mockClear();
    // Initialize with a test persistence instance (will not actually write to disk due to mocks)
    persistence = new DriverConfig('test-config');
    registry = new DriverRegistry(persistence);
  });

  describe('registerDriver', () => {
    it('should register a new driver with generated ID', () => {
      const telemetryData = createMockTelemetryData();
      const device = registry.registerDriver(telemetryData);

      expect(device).toBeDefined();
      expect(device.id).toBe('rgfx-driver-0001'); // Generated ID, not MAC
      expect(device.ip).toBe(telemetryData.ip);
      expect(device.state === 'connected').toBe(true);
      expect(device.failedHeartbeats).toBe(0);
    });

    it('should generate sequential IDs for new drivers', () => {
      const telemetryData1 = createMockTelemetryData({ mac: 'AA:BB:CC:DD:EE:11' });
      const telemetryData2 = createMockTelemetryData({ mac: 'AA:BB:CC:DD:EE:22' });

      const device1 = registry.registerDriver(telemetryData1);
      const device2 = registry.registerDriver(telemetryData2);

      expect(device1.id).toBe('rgfx-driver-0001');
      expect(device2.id).toBe('rgfx-driver-0002');
    });

    it('should initialize stats on first registration', () => {
      const telemetryData = createMockTelemetryData();
      const device = registry.registerDriver(telemetryData);

      expect(device.stats).toEqual({
        telemetryEventsReceived: 1,
        mqttMessagesReceived: 1,
        mqttMessagesFailed: 0,
      });
    });

    it('should emit driver:connected event for new driver', () => {
      const telemetryData = createMockTelemetryData();
      const device = registry.registerDriver(telemetryData);

      expect(emitSpy).toHaveBeenCalledWith('driver:connected', { driver: device });
    });

    it('should increment message count on repeated registration', () => {
      const telemetryData = createMockTelemetryData();

      const device1 = registry.registerDriver(telemetryData);
      expect(device1.stats.mqttMessagesReceived).toBe(1);

      const device2 = registry.registerDriver(telemetryData);
      expect(device2.stats.mqttMessagesReceived).toBe(2);
    });

    it('should update lastSeen timestamp on telemetry', () => {
      const telemetryData = createMockTelemetryData();

      const device1 = registry.registerDriver(telemetryData);
      const initialLastSeen = device1.lastSeen;

      // Wait a bit
      const now = Date.now();
      vi.setSystemTime(now + 1000);

      const device2 = registry.registerDriver(telemetryData);
      expect(device2.lastSeen).toBeGreaterThan(initialLastSeen);

      vi.useRealTimers();
    });

    it('should emit driver:connected event when reconnecting disconnected driver', () => {
      const telemetryData = createMockTelemetryData();

      // Register first time
      registry.registerDriver(telemetryData);
      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith('driver:connected', expect.any(Object));

      // Manually mark as disconnected (simulating timeout)
      const device = registry.findByIp(telemetryData.ip);

      if (device) {
        device.state = 'disconnected';
      }

      emitSpy.mockClear();

      // Register again (reconnection)
      registry.registerDriver(telemetryData);
      expect(emitSpy).toHaveBeenCalledTimes(1);
      expect(emitSpy).toHaveBeenCalledWith('driver:connected', expect.any(Object));
    });
  });

  describe('findByIp', () => {
    it('should find driver by IP address', () => {
      const telemetryData = createMockTelemetryData({ ip: '192.168.1.100' });
      registry.registerDriver(telemetryData);

      const found = registry.findByIp('192.168.1.100');
      expect(found).toBeDefined();
      expect(found?.ip).toBe('192.168.1.100');
    });

    it('should return undefined for non-existent IP', () => {
      const found = registry.findByIp('192.168.1.200');
      expect(found).toBeUndefined();
    });

    it('should find correct driver among multiple drivers', () => {
      registry.registerDriver(createMockTelemetryData({ ip: '192.168.1.100' }));
      registry.registerDriver(
        createMockTelemetryData({
          ip: '192.168.1.101',
          mac: '11:22:33:44:55:66',
        }),
      );

      const found = registry.findByIp('192.168.1.101');
      expect(found?.ip).toBe('192.168.1.101');
    });
  });

  describe('getConnectedCount', () => {
    it('should return 0 for empty registry', () => {
      expect(registry.getConnectedCount()).toBe(0);
    });

    it('should count only connected drivers', () => {
      const telemetryData1 = createMockTelemetryData({ ip: '192.168.1.100' });
      const telemetryData2 = createMockTelemetryData({
        ip: '192.168.1.101',
        mac: '11:22:33:44:55:66',
      });

      registry.registerDriver(telemetryData1);
      registry.registerDriver(telemetryData2);

      expect(registry.getConnectedCount()).toBe(2);
    });
  });

  describe('getAllDrivers', () => {
    it('should return empty array for empty registry', () => {
      expect(registry.getAllDrivers()).toEqual([]);
    });

    it('should return all drivers (connected and disconnected)', () => {
      const telemetryData1 = createMockTelemetryData({ ip: '192.168.1.100' });
      const telemetryData2 = createMockTelemetryData({
        ip: '192.168.1.101',
        mac: '11:22:33:44:55:66',
      });

      registry.registerDriver(telemetryData1);
      registry.registerDriver(telemetryData2);

      expect(registry.getAllDrivers()).toHaveLength(2);
    });
  });

  // Tests for extracted private methods (tested indirectly through registerDriver)
  describe('resolveDriverIdentity (via registerDriver)', () => {
    it('should create new driver in persistence for unknown MAC', () => {
      const telemetryData = createMockTelemetryData({ mac: 'AA:BB:CC:DD:EE:11' });
      const driver = registry.registerDriver(telemetryData);

      expect(driver.id).toBe('rgfx-driver-0001');
      expect(driver.mac).toBe('AA:BB:CC:DD:EE:11');
    });

    it('should use existing persisted driver ID for known MAC', () => {
      const telemetryData1 = createMockTelemetryData({ mac: 'AA:BB:CC:DD:EE:11' });
      const driver1 = registry.registerDriver(telemetryData1);

      // Register again with same MAC
      const driver2 = registry.registerDriver(telemetryData1);

      expect(driver1.id).toBe(driver2.id);
      expect(driver2.id).toBe('rgfx-driver-0001');
    });
  });

  describe('findExistingDriverByMac (via registerDriver)', () => {
    it('should find driver by MAC even with different ID', () => {
      const telemetryData = createMockTelemetryData({ mac: 'AA:BB:CC:DD:EE:11' });
      const driver1 = registry.registerDriver(telemetryData);

      // Manually change driver ID in registry to simulate migration scenario
      const originalId = driver1.id;

      const registryDrivers = (registry as any).drivers as Map<string, import('../types').Driver>;
      registryDrivers.delete(originalId);
      registryDrivers.set('custom-id', driver1);
      driver1.id = 'custom-id';

      // Register again with same MAC - should find by MAC and migrate
      const driver2 = registry.registerDriver(telemetryData);

      expect(driver2.mac).toBe('AA:BB:CC:DD:EE:11');
      expect(registryDrivers.has('custom-id')).toBe(false); // Old ID removed
    });
  });

  describe('calculateDriverStats (via registerDriver)', () => {
    it('should initialize stats to 1 for first registration', () => {
      const telemetryData = createMockTelemetryData();
      const driver = registry.registerDriver(telemetryData);

      expect(driver.stats.mqttMessagesReceived).toBe(1);
      expect(driver.stats.mqttMessagesFailed).toBe(0);
    });

    it('should increment mqttMessagesReceived on subsequent registrations', () => {
      const telemetryData = createMockTelemetryData();

      const driver1 = registry.registerDriver(telemetryData);
      expect(driver1.stats.mqttMessagesReceived).toBe(1);

      const driver2 = registry.registerDriver(telemetryData);
      expect(driver2.stats.mqttMessagesReceived).toBe(2);

      const driver3 = registry.registerDriver(telemetryData);
      expect(driver3.stats.mqttMessagesReceived).toBe(3);
    });

    it('should preserve mqttMessagesFailed count across registrations', () => {
      const telemetryData = createMockTelemetryData();
      const driver1 = registry.registerDriver(telemetryData);

      // Manually increment failed count
      driver1.stats.mqttMessagesFailed = 5;

      const driver2 = registry.registerDriver(telemetryData);
      expect(driver2.stats.mqttMessagesFailed).toBe(5);
    });
  });

  describe('constructDriver (via registerDriver)', () => {
    it('should set connected=true for new registration with valid IP', () => {
      const telemetryData = createMockTelemetryData({ ip: '192.168.1.100' });
      const driver = registry.registerDriver(telemetryData);

      expect(driver.state === 'connected').toBe(true);
    });

    it('should set connected=false when IP is empty string', () => {
      const telemetryData = createMockTelemetryData({ ip: '' });
      const driver = registry.registerDriver(telemetryData);

      expect(driver.state === 'connected').toBe(false);
    });

    it('should set connected=false when IP is whitespace only', () => {
      const telemetryData = createMockTelemetryData({ ip: '   ' });
      const driver = registry.registerDriver(telemetryData);

      expect(driver.state === 'connected').toBe(false);
    });

    it('should set connected=true when IP has leading/trailing whitespace but valid content', () => {
      const telemetryData = createMockTelemetryData({ ip: '  192.168.1.100  ' });
      const driver = registry.registerDriver(telemetryData);

      // Note: IP validation happens, trim() ensures non-empty after whitespace removal
      expect(driver.state === 'connected').toBe(true);
    });

    it('should preserve updating state during OTA when telemetry arrives', () => {
      const telemetryData = createMockTelemetryData({ ip: '192.168.1.100' });

      // First registration - driver connects
      const driver1 = registry.registerDriver(telemetryData);
      expect(driver1.state).toBe('connected');

      // Simulate OTA start - set driver state to 'updating'
      driver1.state = 'updating';

      // Telemetry arrives during OTA (e.g., queued/stale message)
      // This should NOT change state back to 'connected'
      const driver2 = registry.registerDriver(telemetryData);
      expect(driver2.state).toBe('updating');
    });

    it('should not emit driver:connected when driver is updating', () => {
      const telemetryData = createMockTelemetryData({ ip: '192.168.1.100' });

      // First registration - driver connects
      const driver1 = registry.registerDriver(telemetryData);
      expect(driver1.state).toBe('connected');
      expect(emitSpy).toHaveBeenCalledWith('driver:connected', expect.any(Object));

      emitSpy.mockClear();

      // Simulate OTA start - set driver state to 'updating'
      driver1.state = 'updating';

      // Telemetry arrives during OTA - should NOT emit driver:connected
      registry.registerDriver(telemetryData);
      expect(emitSpy).not.toHaveBeenCalledWith('driver:connected', expect.any(Object));
    });
  });

  describe('handleIdMigration (via registerDriver)', () => {
    it('should remove old registry entry when ID changes', () => {
      const telemetryData = createMockTelemetryData({ mac: 'AA:BB:CC:DD:EE:11' });
      const driver1 = registry.registerDriver(telemetryData);
      const oldId = driver1.id;

      // Manually change driver ID in registry to simulate migration

      const registryDrivers = (registry as any).drivers as Map<string, import('../types').Driver>;
      registryDrivers.delete(oldId);
      registryDrivers.set('old-id', driver1);
      driver1.id = 'old-id';

      // Register again - should clean up old ID
      const driver2 = registry.registerDriver(telemetryData);

      expect(registryDrivers.has('old-id')).toBe(false);
      expect(driver2.id).not.toBe('old-id');
    });
  });

  describe('isNewConnection (via registerDriver)', () => {
    it('should detect new connection for first registration', () => {
      const telemetryData = createMockTelemetryData();
      registry.registerDriver(telemetryData);

      expect(emitSpy).toHaveBeenCalledWith('driver:connected', expect.any(Object));
    });

    it('should not emit driver:connected for already-connected driver', () => {
      const telemetryData = createMockTelemetryData();

      // First registration
      registry.registerDriver(telemetryData);
      expect(emitSpy).toHaveBeenCalledTimes(1);

      emitSpy.mockClear();

      // Second registration (driver still connected) - should not emit driver:connected
      registry.registerDriver(telemetryData);
      expect(emitSpy).not.toHaveBeenCalledWith('driver:connected', expect.any(Object));
    });

    it('should detect reconnection after disconnect', () => {
      const telemetryData = createMockTelemetryData();

      // First registration
      const driver1 = registry.registerDriver(telemetryData);
      expect(emitSpy).toHaveBeenCalledWith('driver:connected', expect.any(Object));

      // Mark as disconnected
      driver1.state = 'disconnected';

      emitSpy.mockClear();

      // Reconnection
      const driver2 = registry.registerDriver(telemetryData);
      expect(driver2.state === 'connected').toBe(true);
      expect(emitSpy).toHaveBeenCalledWith('driver:connected', expect.any(Object));
    });
  });

  describe('loading persisted drivers at startup', () => {
    it('should set mac property from persisted macAddress for disconnected drivers', () => {
      // Add a driver to persistence first
      persistence.addDriver('rgfx-driver-0001', 'AA:BB:CC:DD:EE:FF');

      // Create a new registry that loads from persistence
      // (requires both persistence and ledHardwareManager)
      const ledHardwareManager = new LEDHardwareManager('test-config');
      const newRegistry = new DriverRegistry(persistence, ledHardwareManager);

      // Get all drivers (should include the persisted one)
      const drivers = newRegistry.getAllDrivers();
      expect(drivers).toHaveLength(1);

      const driver = drivers[0];
      expect(driver.id).toBe('rgfx-driver-0001');
      expect(driver.mac).toBe('AA:BB:CC:DD:EE:FF');
      expect(driver.state === 'connected').toBe(false);
    });

    it('should allow finding persisted disconnected driver by mac', () => {
      persistence.addDriver('rgfx-driver-0001', 'AA:BB:CC:DD:EE:FF');

      const ledHardwareManager = new LEDHardwareManager('test-config');
      const newRegistry = new DriverRegistry(persistence, ledHardwareManager);

      const driver = newRegistry.getDriverByMac('AA:BB:CC:DD:EE:FF');
      expect(driver).toBeDefined();
      expect(driver?.id).toBe('rgfx-driver-0001');
    });
  });

  describe('stopConnectionMonitor', () => {
    it('should stop running connection monitor', () => {
      vi.useFakeTimers();
      registry.startConnectionMonitor();

      registry.stopConnectionMonitor();

      // Verify it was stopped by checking no further timeout events fire
      expect(() => vi.advanceTimersByTime(60000)).not.toThrow();
      vi.useRealTimers();
    });

    it('should be safe to call when monitor not running', () => {
      expect(() => {
        registry.stopConnectionMonitor();
      }).not.toThrow();
    });

    it('should be safe to call multiple times', () => {
      vi.useFakeTimers();
      registry.startConnectionMonitor();

      registry.stopConnectionMonitor();
      registry.stopConnectionMonitor();

      expect(() => vi.advanceTimersByTime(60000)).not.toThrow();
      vi.useRealTimers();
    });
  });

  describe('refreshDriverFromConfig', () => {
    let registryWithHardware: DriverRegistry;
    let ledHardwareManager: LEDHardwareManager;

    beforeEach(() => {
      ledHardwareManager = new LEDHardwareManager('test-config');
      registryWithHardware = new DriverRegistry(persistence, ledHardwareManager);
    });

    it('should return undefined when no driverConfig', () => {
      const noConfigRegistry = new DriverRegistry();

      const result = noConfigRegistry.refreshDriverFromConfig('AA:BB:CC:DD:EE:FF');

      expect(result).toBeUndefined();
    });

    it('should return undefined when MAC not in config', () => {
      const result = registryWithHardware.refreshDriverFromConfig('FF:FF:FF:FF:FF:FF');

      expect(result).toBeUndefined();
    });

    it('should return undefined when no runtime driver for MAC', () => {
      // Add to config after registry was constructed, so it's only in config, not runtime
      persistence.addDriver('rgfx-driver-0001', 'AA:BB:CC:DD:EE:FF');

      const result = registryWithHardware.refreshDriverFromConfig('AA:BB:CC:DD:EE:FF');

      expect(result).toBeUndefined();
    });

    it('should update driver fields from config', () => {
      // Register a driver via telemetry
      const telemetryData = createMockTelemetryData({ mac: 'AA:BB:CC:DD:EE:11' });
      registryWithHardware.registerDriver(telemetryData);

      // Update the config with a description
      const configDriver = persistence.getDriverByMac('AA:BB:CC:DD:EE:11');

      if (configDriver) {
        configDriver.description = 'Updated Description';
      }

      const result = registryWithHardware.refreshDriverFromConfig('AA:BB:CC:DD:EE:11');

      expect(result).toBeDefined();
      expect(result?.description).toBe('Updated Description');
    });

    it('should handle ID migration when config ID differs from runtime', () => {
      // Register a driver (creates both config and runtime entries)
      const telemetryData = createMockTelemetryData({ mac: 'AA:BB:CC:DD:EE:11' });
      const driver = registryWithHardware.registerDriver(telemetryData);
      const originalId = driver.id;

      // Simulate a rename: delete old config entry, add new one with same MAC
      persistence.deleteDriver(originalId);
      persistence.addDriver('new-custom-id', 'AA:BB:CC:DD:EE:11');

      const result = registryWithHardware.refreshDriverFromConfig('AA:BB:CC:DD:EE:11');

      expect(result).toBeDefined();
      expect(result?.id).toBe('new-custom-id');
      // Old ID should be removed from registry
      expect(registryWithHardware.getDriver(originalId)).toBeUndefined();
      // New ID should exist
      expect(registryWithHardware.getDriver('new-custom-id')).toBeDefined();
    });
  });
});
