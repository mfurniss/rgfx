import { describe, it, expect, beforeEach, vi } from "vitest";
import { DriverRegistry } from "../driver-registry";
import { DriverPersistence } from "../driver-persistence";
import type { DriverSystemInfo } from "../types";

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

describe("DriverRegistry", () => {
  let registry: DriverRegistry;
  let persistence: DriverPersistence;

  beforeEach(() => {
    vi.clearAllMocks();
    // Initialize with a test persistence instance (will not actually write to disk due to mocks)
    persistence = new DriverPersistence('test-config');
    registry = new DriverRegistry(persistence);
  });

  const createMockSysInfo = (
    overrides: Partial<DriverSystemInfo> = {}
  ): DriverSystemInfo => ({
    // Network information
    ip: "192.168.1.100",
    mac: "AA:BB:CC:DD:EE:FF",
    hostname: "esp32-driver",
    rssi: -50,
    ssid: "TestNetwork",
    // Chip information
    chipModel: "ESP32",
    chipRevision: 1,
    chipCores: 2,
    cpuFreqMHz: 240,
    // Memory information
    flashSize: 4194304,
    flashSpeed: 40000000,
    freeHeap: 200000,
    heapSize: 327680,
    psramSize: 0,
    freePsram: 0,
    // Software information
    sdkVersion: "v4.4",
    sketchSize: 1000000,
    freeSketchSpace: 2000000,
    uptimeMs: 60000,
    // Display information
    hasDisplay: false,
    // Note: LED configuration removed - now managed by Hub
    ...overrides,
  });

  describe("registerDriver", () => {
    it("should register a new driver", () => {
      const sysInfo = createMockSysInfo();
      const device = registry.registerDriver(sysInfo);

      expect(device).toBeDefined();
      expect(device.id).toBe(sysInfo.mac);
      expect(device.name).toBe(sysInfo.hostname);
      expect(device.ip).toBe(sysInfo.ip);
      expect(device.connected).toBe(true);
      expect(device.failedHeartbeats).toBe(0);
    });

    it("should use IP as ID when MAC is not available", () => {
      const sysInfo = createMockSysInfo({ mac: undefined });
      const device = registry.registerDriver(sysInfo);

      expect(device.id).toBe(sysInfo.ip);
    });

    it("should use IP as name when hostname is not available", () => {
      const sysInfo = createMockSysInfo({ hostname: undefined });
      const device = registry.registerDriver(sysInfo);

      expect(device.name).toBe(sysInfo.ip);
    });

    it("should initialize stats on first registration", () => {
      const sysInfo = createMockSysInfo();
      const device = registry.registerDriver(sysInfo);

      expect(device.stats).toEqual({
        mqttMessagesReceived: 1,
        mqttMessagesFailed: 0,
        udpMessagesSent: 0,
        udpMessagesFailed: 0,
      });
    });

    it("should call onDriverConnected callback for new driver", () => {
      const callback = vi.fn();
      registry.onDriverConnected(callback);

      const sysInfo = createMockSysInfo();
      const device = registry.registerDriver(sysInfo);

      expect(callback).toHaveBeenCalledWith(device);
    });

    it("should increment message count on repeated registration", () => {
      const sysInfo = createMockSysInfo();

      const device1 = registry.registerDriver(sysInfo);
      expect(device1.stats.mqttMessagesReceived).toBe(1);

      const device2 = registry.registerDriver(sysInfo);
      expect(device2.stats.mqttMessagesReceived).toBe(2);
    });

    it("should update lastSeen timestamp on heartbeat", () => {
      const sysInfo = createMockSysInfo();

      const device1 = registry.registerDriver(sysInfo);
      const firstSeen = device1.lastSeen;

      // Wait a bit
      const now = Date.now();
      vi.setSystemTime(now + 1000);

      const device2 = registry.registerDriver(sysInfo);
      expect(device2.lastSeen).toBeGreaterThan(firstSeen);

      vi.useRealTimers();
    });

    it("should call onDriverConnected when reconnecting disconnected driver", () => {
      const callback = vi.fn();
      registry.onDriverConnected(callback);

      const sysInfo = createMockSysInfo();

      // Register first time
      registry.registerDriver(sysInfo);
      expect(callback).toHaveBeenCalledTimes(1);

      // Manually mark as disconnected (simulating timeout)
      const device = registry.findByIp(sysInfo.ip);
      if (device) {
        device.connected = false;
      }

      // Register again (reconnection)
      registry.registerDriver(sysInfo);
      expect(callback).toHaveBeenCalledTimes(2);
    });
  });

  describe("findByIp", () => {
    it("should find driver by IP address", () => {
      const sysInfo = createMockSysInfo({ ip: "192.168.1.100" });
      registry.registerDriver(sysInfo);

      const found = registry.findByIp("192.168.1.100");
      expect(found).toBeDefined();
      expect(found?.ip).toBe("192.168.1.100");
    });

    it("should return undefined for non-existent IP", () => {
      const found = registry.findByIp("192.168.1.200");
      expect(found).toBeUndefined();
    });

    it("should find correct driver among multiple drivers", () => {
      registry.registerDriver(createMockSysInfo({ ip: "192.168.1.100" }));
      registry.registerDriver(createMockSysInfo({
        ip: "192.168.1.101",
        mac: "11:22:33:44:55:66"
      }));

      const found = registry.findByIp("192.168.1.101");
      expect(found?.ip).toBe("192.168.1.101");
    });
  });

  describe("trackUdpSent", () => {
    it("should increment udpMessagesSent on success", () => {
      const sysInfo = createMockSysInfo({ ip: "192.168.1.100" });
      registry.registerDriver(sysInfo);

      const device = registry.trackUdpSent("192.168.1.100", true);

      expect(device?.stats.udpMessagesSent).toBe(1);
      expect(device?.stats.udpMessagesFailed).toBe(0);
    });

    it("should increment udpMessagesFailed on failure", () => {
      const sysInfo = createMockSysInfo({ ip: "192.168.1.100" });
      registry.registerDriver(sysInfo);

      const device = registry.trackUdpSent("192.168.1.100", false);

      expect(device?.stats.udpMessagesSent).toBe(0);
      expect(device?.stats.udpMessagesFailed).toBe(1);
    });

    it("should return undefined for non-existent IP", () => {
      const device = registry.trackUdpSent("192.168.1.200", true);
      expect(device).toBeUndefined();
    });

    it("should call onDriverConnected callback after tracking", () => {
      const callback = vi.fn();
      registry.onDriverConnected(callback);

      const sysInfo = createMockSysInfo({ ip: "192.168.1.100" });
      registry.registerDriver(sysInfo);

      // Reset mock to only count trackUdpSent callback
      callback.mockClear();

      registry.trackUdpSent("192.168.1.100", true);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("processHeartbeatFailures", () => {
    it("should mark driver as disconnected after reaching failure threshold", () => {
      const callback = vi.fn();
      registry.onDriverDisconnected(callback);

      const sysInfo = createMockSysInfo();
      const driver = registry.registerDriver(sysInfo);

      // First heartbeat cycle - driver didn't respond
      const respondedDrivers1 = new Set<string>();
      registry.processHeartbeatFailures(respondedDrivers1);

      // Driver should still be connected (threshold is 2)
      expect(driver.failedHeartbeats).toBe(1);
      expect(driver.connected).toBe(true);
      expect(callback).not.toHaveBeenCalled();

      // Second heartbeat cycle - driver didn't respond again
      const respondedDrivers2 = new Set<string>();
      const disconnectedCount = registry.processHeartbeatFailures(respondedDrivers2);

      // Now driver should be disconnected (reached threshold of 2)
      expect(disconnectedCount).toBe(1);
      expect(callback).toHaveBeenCalled();

      const device = registry.findByIp(sysInfo.ip);
      expect(device?.connected).toBe(false);
      expect(device?.failedHeartbeats).toBe(2);
    });

    it("should reset failure counter when driver responds", () => {
      const callback = vi.fn();
      registry.onDriverDisconnected(callback);

      const sysInfo = createMockSysInfo();
      const driver = registry.registerDriver(sysInfo);

      // First heartbeat cycle - driver didn't respond
      const respondedDrivers1 = new Set<string>();
      registry.processHeartbeatFailures(respondedDrivers1);

      expect(driver.failedHeartbeats).toBe(1);

      // Second heartbeat cycle - driver responded
      const respondedDrivers2 = new Set<string>([driver.id]);
      registry.updateHeartbeat(driver.id); // This resets failedHeartbeats
      const disconnectedCount = registry.processHeartbeatFailures(respondedDrivers2);

      expect(disconnectedCount).toBe(0);
      expect(callback).not.toHaveBeenCalled();

      const device = registry.findByIp(sysInfo.ip);
      expect(device?.connected).toBe(true);
      expect(device?.failedHeartbeats).toBe(0);
    });

    it("should not re-disconnect already disconnected driver", () => {
      const callback = vi.fn();
      registry.onDriverDisconnected(callback);

      const sysInfo = createMockSysInfo();
      registry.registerDriver(sysInfo);

      // Simulate two failed heartbeats to disconnect
      const emptySet = new Set<string>();
      registry.processHeartbeatFailures(emptySet);
      registry.processHeartbeatFailures(emptySet);

      expect(callback).toHaveBeenCalledTimes(1);

      // Another heartbeat cycle - should not call callback again
      registry.processHeartbeatFailures(emptySet);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe("getConnectedCount", () => {
    it("should return 0 for empty registry", () => {
      expect(registry.getConnectedCount()).toBe(0);
    });

    it("should count only connected drivers", () => {
      const sysInfo1 = createMockSysInfo({ ip: "192.168.1.100" });
      const sysInfo2 = createMockSysInfo({
        ip: "192.168.1.101",
        mac: "11:22:33:44:55:66"
      });

      registry.registerDriver(sysInfo1);
      registry.registerDriver(sysInfo2);

      expect(registry.getConnectedCount()).toBe(2);

      // Simulate both drivers not responding to heartbeats
      const emptySet = new Set<string>();
      registry.processHeartbeatFailures(emptySet); // First missed heartbeat
      registry.processHeartbeatFailures(emptySet); // Second missed heartbeat - disconnected

      expect(registry.getConnectedCount()).toBe(0);
    });
  });

  describe("getAllDrivers", () => {
    it("should return empty array for empty registry", () => {
      expect(registry.getAllDrivers()).toEqual([]);
    });

    it("should return all drivers (connected and disconnected)", () => {
      const sysInfo1 = createMockSysInfo({ ip: "192.168.1.100" });
      const sysInfo2 = createMockSysInfo({
        ip: "192.168.1.101",
        mac: "11:22:33:44:55:66"
      });

      registry.registerDriver(sysInfo1);
      registry.registerDriver(sysInfo2);

      expect(registry.getAllDrivers()).toHaveLength(2);

      // Disconnect drivers via heartbeat failures
      const emptySet = new Set<string>();
      registry.processHeartbeatFailures(emptySet); // First missed heartbeat
      registry.processHeartbeatFailures(emptySet); // Second missed heartbeat - disconnected

      // Should still return all drivers, even if disconnected
      expect(registry.getAllDrivers()).toHaveLength(2);
    });
  });
});
