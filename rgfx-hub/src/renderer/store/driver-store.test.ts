import { describe, it, expect, beforeEach } from 'vitest';
import { useDriverStore } from './driver-store';
import { Driver, DriverTelemetry } from '../../types';

describe('driver-store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useDriverStore.setState({
      drivers: [],
      systemStatus: {
        mqttBroker: 'stopped',
        udpServer: 'inactive',
        eventReader: 'stopped',
        driversConnected: 0,
        hubIp: 'Unknown',
        eventsProcessed: 0,
        hubStartTime: 0,
      },
    });
  });

  const createMockDriver = (
    id: string,
    mac: string,
    connected = true
  ): Driver => {
    const telemetry: DriverTelemetry = {
      chipModel: 'ESP32',
      chipRevision: 3,
      chipCores: 2,
      cpuFreqMHz: 240,
      flashSize: 4194304,
      flashSpeed: 40000000,
      heapSize: 327680,
      psramSize: 0,
      freePsram: 0,
      sdkVersion: 'v4.4.2',
      sketchSize: 1000000,
      freeSketchSpace: 2000000,
      hasDisplay: false,
    };

    return new Driver({
      id,
      lastSeen: Date.now(),
      failedHeartbeats: 0,
      lastSeenAt: connected ? Date.now() : undefined,
      ip: connected ? '192.168.1.100' : undefined,
      mac,
      hostname: connected ? id : undefined,
      ssid: connected ? 'test-network' : undefined,
      rssi: connected ? -50 : undefined,
      freeHeap: connected ? 200000 : undefined,
      minFreeHeap: connected ? 180000 : undefined,
      uptimeMs: connected ? 60000 : undefined,
      telemetry: connected ? telemetry : undefined,
      stats: {
        mqttMessagesReceived: 0,
        mqttMessagesFailed: 0,
        udpMessagesSent: 0,
        udpMessagesFailed: 0,
      },
      connected,
    });
  };

  describe('onDriverConnected', () => {
    it('should add a new driver when it does not exist', () => {
      const driver = createMockDriver('rgfx-driver-0001', 'AA:BB:CC:DD:EE:FF');

      useDriverStore.getState().onDriverConnected(driver);

      const drivers = useDriverStore.getState().drivers;
      expect(drivers).toHaveLength(1);
      expect(drivers[0].id).toBe('rgfx-driver-0001');
    });

    it('should update existing driver when ID matches', () => {
      const driver1 = createMockDriver('rgfx-driver-0001', 'AA:BB:CC:DD:EE:FF');

      useDriverStore.getState().onDriverConnected(driver1);

      // Create driver with modified failedHeartbeats
      const driver2 = createMockDriver('rgfx-driver-0001', 'AA:BB:CC:DD:EE:FF');
      driver2.failedHeartbeats = 1;

      useDriverStore.getState().onDriverConnected(driver2);

      const drivers = useDriverStore.getState().drivers;
      expect(drivers).toHaveLength(1);
      expect(drivers[0].failedHeartbeats).toBe(1);
    });

    it('should replace old entry when MAC matches but ID changed (driver migration)', () => {
      // Simulate driver connecting with MAC as ID (before set-id)
      const driverWithMacId = createMockDriver(
        'AA:BB:CC:DD:EE:FF',
        'AA:BB:CC:DD:EE:FF'
      );

      useDriverStore.getState().onDriverConnected(driverWithMacId);

      expect(useDriverStore.getState().drivers).toHaveLength(1);
      expect(useDriverStore.getState().drivers[0].id).toBe('AA:BB:CC:DD:EE:FF');

      // Simulate driver reconnecting with custom ID (after set-id)
      const driverWithCustomId = createMockDriver(
        'rgfx-driver-0001',
        'AA:BB:CC:DD:EE:FF'
      );

      useDriverStore.getState().onDriverConnected(driverWithCustomId);

      // Should have replaced the old entry, not created duplicate
      const drivers = useDriverStore.getState().drivers;
      expect(drivers).toHaveLength(1);
      expect(drivers[0].id).toBe('rgfx-driver-0001');
    });

    it('should handle multiple drivers with different MACs', () => {
      const driver1 = createMockDriver('rgfx-driver-0001', 'AA:BB:CC:DD:EE:FF');
      const driver2 = createMockDriver('rgfx-driver-0002', '11:22:33:44:55:66');

      useDriverStore.getState().onDriverConnected(driver1);
      useDriverStore.getState().onDriverConnected(driver2);

      const drivers = useDriverStore.getState().drivers;
      expect(drivers).toHaveLength(2);
    });

    it('should handle driver with no telemetry', () => {
      const driver = new Driver({
        id: 'rgfx-driver-0001',
        mac: 'AA:BB:CC:DD:EE:FF',
        lastSeen: Date.now(),
        failedHeartbeats: 0,
        telemetry: undefined,
        stats: {
          mqttMessagesReceived: 0,
          mqttMessagesFailed: 0,
          udpMessagesSent: 0,
          udpMessagesFailed: 0,
        },
        connected: false,
      });

      useDriverStore.getState().onDriverConnected(driver);

      const drivers = useDriverStore.getState().drivers;
      expect(drivers).toHaveLength(1);
      expect(drivers[0].id).toBe('rgfx-driver-0001');
    });
  });

  describe('onDriverUpdated', () => {
    it('should update existing driver by ID', () => {
      const driver = createMockDriver('rgfx-driver-0001', 'AA:BB:CC:DD:EE:FF');
      useDriverStore.getState().onDriverConnected(driver);

      // Create updated driver with modified failedHeartbeats
      const updatedDriver = createMockDriver('rgfx-driver-0001', 'AA:BB:CC:DD:EE:FF');
      updatedDriver.failedHeartbeats = 5;

      useDriverStore.getState().onDriverUpdated(updatedDriver);

      const drivers = useDriverStore.getState().drivers;
      expect(drivers).toHaveLength(1);
      expect(drivers[0].failedHeartbeats).toBe(5);
    });

    it('should replace old entry when MAC matches but ID changed during update', () => {
      const driverWithMacId = createMockDriver(
        'AA:BB:CC:DD:EE:FF',
        'AA:BB:CC:DD:EE:FF'
      );

      useDriverStore.getState().onDriverConnected(driverWithMacId);

      const driverWithCustomId = createMockDriver(
        'rgfx-driver-0001',
        'AA:BB:CC:DD:EE:FF'
      );

      useDriverStore.getState().onDriverUpdated(driverWithCustomId);

      const drivers = useDriverStore.getState().drivers;
      expect(drivers).toHaveLength(1);
      expect(drivers[0].id).toBe('rgfx-driver-0001');
    });
  });

  describe('onDriverDisconnected', () => {
    it('should mark driver as disconnected', () => {
      const driver = createMockDriver('rgfx-driver-0001', 'AA:BB:CC:DD:EE:FF', true);
      useDriverStore.getState().onDriverConnected(driver);

      // Create disconnected driver by clearing IP
      const disconnectedDriver = createMockDriver('rgfx-driver-0001', 'AA:BB:CC:DD:EE:FF', false);
      useDriverStore.getState().onDriverDisconnected(disconnectedDriver);

      const drivers = useDriverStore.getState().drivers;
      expect(drivers).toHaveLength(1);
      expect(drivers[0].connected).toBe(false);
    });
  });

  describe('selectors', () => {
    it('connectedDrivers should return only connected drivers', () => {
      const driver1 = createMockDriver('rgfx-driver-0001', 'AA:BB:CC:DD:EE:FF', true);
      const driver2 = createMockDriver(
        'rgfx-driver-0002',
        '11:22:33:44:55:66',
        false
      );

      useDriverStore.getState().onDriverConnected(driver1);
      useDriverStore.getState().onDriverConnected(driver2);

      const connectedDrivers = useDriverStore.getState().connectedDrivers();
      expect(connectedDrivers).toHaveLength(1);
      expect(connectedDrivers[0].id).toBe('rgfx-driver-0001');
    });

    it('getDriverById should return driver by ID', () => {
      const driver = createMockDriver('rgfx-driver-0001', 'AA:BB:CC:DD:EE:FF');
      useDriverStore.getState().onDriverConnected(driver);

      const found = useDriverStore.getState().getDriverById('rgfx-driver-0001');
      expect(found).toBeDefined();
      expect(found?.id).toBe('rgfx-driver-0001');
    });

    it('getDriverById should return undefined for non-existent driver', () => {
      const found = useDriverStore.getState().getDriverById('non-existent');
      expect(found).toBeUndefined();
    });
  });
});
