import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DriverRegistry } from '../driver-registry';
import { DriverPersistence } from '../driver-persistence';
import type { DriverTelemetry } from '../types';

// Mock electron-log
vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

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
  let persistence: DriverPersistence;

  beforeEach(() => {
    vi.clearAllMocks();
    // Initialize with a test persistence instance (will not actually write to disk due to mocks)
    persistence = new DriverPersistence('test-config');
    registry = new DriverRegistry(persistence);
  });

  const createMockTelemetryData = (overrides: {
    mac?: string;
    ip?: string;
    hostname?: string;
    ssid?: string;
    rssi?: number;
    freeHeap?: number;
    minFreeHeap?: number;
    uptimeMs?: number;
    telemetryOverrides?: Partial<DriverTelemetry>;
  } = {}) => {
    const telemetry: DriverTelemetry = {
      chipModel: 'ESP32',
      chipRevision: 1,
      chipCores: 2,
      cpuFreqMHz: 240,
      flashSize: 4194304,
      flashSpeed: 40000000,
      heapSize: 327680,
      psramSize: 0,
      freePsram: 0,
      hasDisplay: false,
      sdkVersion: 'v4.4',
      sketchSize: 1000000,
      freeSketchSpace: 2000000,
      ...overrides.telemetryOverrides,
    };

    return {
      ip: overrides.ip ?? '192.168.1.100',
      mac: overrides.mac ?? 'AA:BB:CC:DD:EE:FF',
      hostname: overrides.hostname ?? 'esp32-driver',
      ssid: overrides.ssid ?? 'TestNetwork',
      rssi: overrides.rssi ?? -50,
      freeHeap: overrides.freeHeap ?? 200000,
      minFreeHeap: overrides.minFreeHeap ?? 180000,
      uptimeMs: overrides.uptimeMs ?? 60000,
      telemetry,
    };
  };

  describe('registerDriver', () => {
    it('should register a new driver with generated ID', () => {
      const telemetryData = createMockTelemetryData();
      const device = registry.registerDriver(telemetryData);

      expect(device).toBeDefined();
      expect(device.id).toBe('rgfx-driver-0001'); // Generated ID, not MAC
      expect(device.ip).toBe(telemetryData.ip);
      expect(device.connected).toBe(true);
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
        mqttMessagesReceived: 1,
        mqttMessagesFailed: 0,
        udpMessagesSent: 0,
        udpMessagesFailed: 0,
      });
    });

    it('should call onDriverConnected callback for new driver', () => {
      const callback = vi.fn();
      registry.onDriverConnected(callback);

      const telemetryData = createMockTelemetryData();
      const device = registry.registerDriver(telemetryData);

      expect(callback).toHaveBeenCalledWith(device);
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
      const firstSeen = device1.lastSeen;

      // Wait a bit
      const now = Date.now();
      vi.setSystemTime(now + 1000);

      const device2 = registry.registerDriver(telemetryData);
      expect(device2.lastSeen).toBeGreaterThan(firstSeen);

      vi.useRealTimers();
    });

    it('should call onDriverConnected when reconnecting disconnected driver', () => {
      const callback = vi.fn();
      registry.onDriverConnected(callback);

      const telemetryData = createMockTelemetryData();

      // Register first time
      registry.registerDriver(telemetryData);
      expect(callback).toHaveBeenCalledTimes(1);

      // Manually mark as disconnected (simulating timeout)
      const device = registry.findByIp(telemetryData.ip);
      if (device) {
        device.connected = false;
      }

      // Register again (reconnection)
      registry.registerDriver(telemetryData);
      expect(callback).toHaveBeenCalledTimes(2);
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
        })
      );

      const found = registry.findByIp('192.168.1.101');
      expect(found?.ip).toBe('192.168.1.101');
    });
  });

  describe('trackUdpSent', () => {
    it('should increment udpMessagesSent on success', () => {
      const telemetryData = createMockTelemetryData({ ip: '192.168.1.100' });
      registry.registerDriver(telemetryData);

      const device = registry.trackUdpSent('192.168.1.100', true);

      expect(device?.stats.udpMessagesSent).toBe(1);
      expect(device?.stats.udpMessagesFailed).toBe(0);
    });

    it('should increment udpMessagesFailed on failure', () => {
      const telemetryData = createMockTelemetryData({ ip: '192.168.1.100' });
      registry.registerDriver(telemetryData);

      const device = registry.trackUdpSent('192.168.1.100', false);

      expect(device?.stats.udpMessagesSent).toBe(0);
      expect(device?.stats.udpMessagesFailed).toBe(1);
    });

    it('should return undefined for non-existent IP', () => {
      const device = registry.trackUdpSent('192.168.1.200', true);
      expect(device).toBeUndefined();
    });

    it('should call onDriverConnected callback after tracking', () => {
      const callback = vi.fn();
      registry.onDriverConnected(callback);

      const telemetryData = createMockTelemetryData({ ip: '192.168.1.100' });
      registry.registerDriver(telemetryData);

      // Reset mock to only count trackUdpSent callback
      callback.mockClear();

      registry.trackUdpSent('192.168.1.100', true);
      expect(callback).toHaveBeenCalledTimes(1);
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
});
