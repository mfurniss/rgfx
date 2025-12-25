import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDriverStore } from '../driver-store';
import { createMockDriver } from '@/__tests__/factories';
import * as notificationStore from '../notification-store';

// Mock the notification store
vi.mock('../notification-store', () => ({
  notify: vi.fn(),
}));

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
        driversTotal: 0,
        hubIp: 'Unknown',
        eventsProcessed: 0,
        hubStartTime: 0,
        eventTopics: {},
        udpMessagesSent: 0,
        udpMessagesFailed: 0,
      },
    });
  });

  describe('onDriverConnected', () => {
    it('should add a new driver when it does not exist', () => {
      const driver = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF' });

      useDriverStore.getState().onDriverConnected(driver);

      const { drivers } = useDriverStore.getState();
      expect(drivers).toHaveLength(1);
      expect(drivers[0].id).toBe('rgfx-driver-0001');
    });

    it('should update existing driver when ID matches', () => {
      const driver1 = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF' });

      useDriverStore.getState().onDriverConnected(driver1);

      // Create driver with modified failedHeartbeats
      const driver2 = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF' });
      driver2.failedHeartbeats = 1;

      useDriverStore.getState().onDriverConnected(driver2);

      const { drivers } = useDriverStore.getState();
      expect(drivers).toHaveLength(1);
      expect(drivers[0].failedHeartbeats).toBe(1);
    });

    it('should replace old entry when MAC matches but ID changed (driver migration)', () => {
      // Simulate driver connecting with MAC as ID (before set-id)
      const driverWithMacId = createMockDriver({
        id: 'AA:BB:CC:DD:EE:FF',
        mac: 'AA:BB:CC:DD:EE:FF',
      });

      useDriverStore.getState().onDriverConnected(driverWithMacId);

      expect(useDriverStore.getState().drivers).toHaveLength(1);
      expect(useDriverStore.getState().drivers[0].id).toBe('AA:BB:CC:DD:EE:FF');

      // Simulate driver reconnecting with custom ID (after set-id)
      const driverWithCustomId = createMockDriver({
        id: 'rgfx-driver-0001',
        mac: 'AA:BB:CC:DD:EE:FF',
      });

      useDriverStore.getState().onDriverConnected(driverWithCustomId);

      // Should have replaced the old entry, not created duplicate
      const { drivers } = useDriverStore.getState();
      expect(drivers).toHaveLength(1);
      expect(drivers[0].id).toBe('rgfx-driver-0001');
    });

    it('should handle multiple drivers with different MACs', () => {
      const driver1 = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF' });
      const driver2 = createMockDriver({ id: 'rgfx-driver-0002', mac: '11:22:33:44:55:66' });

      useDriverStore.getState().onDriverConnected(driver1);
      useDriverStore.getState().onDriverConnected(driver2);

      const { drivers } = useDriverStore.getState();
      expect(drivers).toHaveLength(2);
    });

    it('should handle driver with no telemetry', () => {
      // state: 'disconnected' sets telemetry to undefined
      const driver = createMockDriver({
        id: 'rgfx-driver-0001',
        mac: 'AA:BB:CC:DD:EE:FF',
        state: 'disconnected',
      });

      useDriverStore.getState().onDriverConnected(driver);

      const { drivers } = useDriverStore.getState();
      expect(drivers).toHaveLength(1);
      expect(drivers[0].id).toBe('rgfx-driver-0001');
    });
  });

  describe('onDriverUpdated', () => {
    it('should update existing driver by ID', () => {
      const driver = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF' });
      useDriverStore.getState().onDriverConnected(driver);

      // Create updated driver with modified failedHeartbeats
      const updatedDriver = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF' });
      updatedDriver.failedHeartbeats = 5;

      useDriverStore.getState().onDriverUpdated(updatedDriver);

      const { drivers } = useDriverStore.getState();
      expect(drivers).toHaveLength(1);
      expect(drivers[0].failedHeartbeats).toBe(5);
    });

    it('should replace old entry when MAC matches but ID changed during update', () => {
      const driverWithMacId = createMockDriver({
        id: 'AA:BB:CC:DD:EE:FF',
        mac: 'AA:BB:CC:DD:EE:FF',
      });

      useDriverStore.getState().onDriverConnected(driverWithMacId);

      const driverWithCustomId = createMockDriver({
        id: 'rgfx-driver-0001',
        mac: 'AA:BB:CC:DD:EE:FF',
      });

      useDriverStore.getState().onDriverUpdated(driverWithCustomId);

      const { drivers } = useDriverStore.getState();
      expect(drivers).toHaveLength(1);
      expect(drivers[0].id).toBe('rgfx-driver-0001');
    });
  });

  describe('onDriverDisconnected', () => {
    it('should mark driver as disconnected', () => {
      const driver = createMockDriver({
        id: 'rgfx-driver-0001',
        mac: 'AA:BB:CC:DD:EE:FF',
        state: 'connected',
      });
      useDriverStore.getState().onDriverConnected(driver);

      // Create disconnected driver by clearing IP
      const disconnectedDriver = createMockDriver({
        id: 'rgfx-driver-0001',
        mac: 'AA:BB:CC:DD:EE:FF',
        state: 'disconnected',
      });
      useDriverStore.getState().onDriverDisconnected(disconnectedDriver);

      const { drivers } = useDriverStore.getState();
      expect(drivers).toHaveLength(1);
      expect(drivers[0].state === 'connected').toBe(false);
    });
  });

  describe('selectors', () => {
    it('connectedDrivers should return only connected drivers', () => {
      const driver1 = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF', state: 'connected' });
      const driver2 = createMockDriver({
        id: 'rgfx-driver-0002',
        mac: '11:22:33:44:55:66',
        state: 'disconnected',
      });

      useDriverStore.getState().onDriverConnected(driver1);
      useDriverStore.getState().onDriverConnected(driver2);

      const connectedDrivers = useDriverStore.getState().connectedDrivers();
      expect(connectedDrivers).toHaveLength(1);
      expect(connectedDrivers[0].id).toBe('rgfx-driver-0001');
    });

    it('getDriverById should return driver by ID', () => {
      const driver = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF' });
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

  describe('state change notifications', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should not notify on initial driver load (prevents startup notification spam)', () => {
      const driver = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF', state: 'connected' });

      // First time driver appears - should NOT notify (prevents startup spam)
      useDriverStore.getState().onDriverConnected(driver);

      expect(notificationStore.notify).not.toHaveBeenCalled();
    });

    it('should notify when existing driver reconnects', () => {
      // First load the driver (no notification expected)
      const driver = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF', state: 'disconnected' });
      useDriverStore.getState().onDriverConnected(driver);

      vi.clearAllMocks();

      // Now reconnect - this should notify
      const reconnectedDriver = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF', state: 'connected' });
      useDriverStore.getState().onDriverConnected(reconnectedDriver);

      expect(notificationStore.notify).toHaveBeenCalledWith('rgfx-driver-0001 connected', 'success');
    });

    it('should notify when driver disconnects', () => {
      const driver = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF', state: 'connected' });
      useDriverStore.getState().onDriverConnected(driver);

      vi.clearAllMocks();

      const disconnectedDriver = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF', state: 'disconnected' });
      useDriverStore.getState().onDriverDisconnected(disconnectedDriver);

      expect(notificationStore.notify).toHaveBeenCalledWith('rgfx-driver-0001 disconnected', 'error');
    });

    it('should notify when driver state changes to updating', () => {
      const driver = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF', state: 'connected' });
      useDriverStore.getState().onDriverConnected(driver);

      vi.clearAllMocks();

      const updatingDriver = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF', state: 'updating' });
      useDriverStore.getState().onDriverUpdated(updatingDriver);

      expect(notificationStore.notify).toHaveBeenCalledWith('rgfx-driver-0001 updating firmware...', 'info');
    });

    it('should not notify disconnect when transitioning from updating state (expected reboot)', () => {
      const driver = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF', state: 'connected' });
      useDriverStore.getState().onDriverConnected(driver);

      // Transition to updating state
      const updatingDriver = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF', state: 'updating' });
      useDriverStore.getState().onDriverUpdated(updatingDriver);

      vi.clearAllMocks();

      // Transition from updating to disconnected (expected reboot)
      const disconnectedDriver = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF', state: 'disconnected' });
      useDriverStore.getState().onDriverDisconnected(disconnectedDriver);

      // Should NOT notify disconnect because driver was in 'updating' state
      expect(notificationStore.notify).not.toHaveBeenCalledWith('rgfx-driver-0001 disconnected', 'error');
    });

    it('should not notify when state does not change', () => {
      const driver = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF', state: 'connected' });
      useDriverStore.getState().onDriverConnected(driver);

      vi.clearAllMocks();

      // Update same driver with same state
      const sameDriver = createMockDriver({ id: 'rgfx-driver-0001', mac: 'AA:BB:CC:DD:EE:FF', state: 'connected' });
      useDriverStore.getState().onDriverUpdated(sameDriver);

      expect(notificationStore.notify).not.toHaveBeenCalled();
    });
  });
});
