import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, mockDeep, type MockProxy, type DeepMockProxy } from 'vitest-mock-extended';
import { subscribeDriverStatus } from '../driver-status';
import type { DriverRegistry } from '@/driver-registry';
import type { SystemMonitor } from '@/system-monitor';
import type { BrowserWindow } from 'electron';
import { Driver, type SystemStatus } from '@/types';
import { createMockDriver, createMqttSubscriptionMock } from '@/__tests__/factories';

describe('subscribeDriverStatus', () => {
  let mqttMock: ReturnType<typeof createMqttSubscriptionMock>;
  let mockDriverRegistry: MockProxy<DriverRegistry>;
  let mockSystemMonitor: MockProxy<SystemMonitor>;
  let mockMainWindow: DeepMockProxy<BrowserWindow>;
  let mockDriver: Driver;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDriver = createMockDriver();

    mqttMock = createMqttSubscriptionMock();

    mockDriverRegistry = mock<DriverRegistry>();
    mockDriverRegistry.getDriverByMac.mockReturnValue(mockDriver);
    mockDriverRegistry.getConnectedCount.mockReturnValue(1);
    mockDriverRegistry.getAllDrivers.mockReturnValue([mockDriver]);

    const mockStatus: SystemStatus = {
      mqttBroker: 'running',
      discovery: 'active',
      eventReader: 'monitoring',
      driversConnected: 1,
      driversTotal: 1,
      hubIp: '192.168.1.1',
      eventsProcessed: 100,
      eventLogSizeBytes: 0,
      hubStartTime: Date.now(),
      firmwareVersions: { 'ESP32': '1.0.0', 'ESP32-S3': '1.0.0' },
      udpMessagesSent: 0,
      udpMessagesFailed: 0,
      udpStatsByDriver: {},
      systemErrors: [],
    };

    mockSystemMonitor = mock<SystemMonitor>();
    mockSystemMonitor.getFullStatus.mockReturnValue(mockStatus);

    mockMainWindow = mockDeep<BrowserWindow>();
    mockMainWindow.isDestroyed.mockReturnValue(false);
  });

  describe('subscription setup', () => {
    it('should subscribe to correct MQTT topic pattern', () => {
      subscribeDriverStatus({
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
      });

      expect(mqttMock.mockMqtt.subscribe).toHaveBeenCalledWith(
        'rgfx/driver/+/status',
        expect.any(Function),
      );
    });
  });

  describe('topic parsing', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
      });
    });

    it('should extract MAC address from topic and look up driver', () => {
      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'offline');

      expect(mockDriverRegistry.getDriverByMac).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    });

    it('should handle invalid topic format gracefully', () => {
      mqttMock.triggerMessage('rgfx/invalid/topic', 'offline');

      expect(mockDriverRegistry.getDriverByMac).not.toHaveBeenCalled();
    });

    it('should handle topic missing status suffix', () => {
      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF', 'offline');

      expect(mockDriverRegistry.getDriverByMac).not.toHaveBeenCalled();
    });
  });

  describe('offline status handling (LWT)', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
      });
    });

    it('should clear driver IP when receiving offline status', () => {
      mockDriver.state = 'connected';
      mockDriver.ip = '192.168.1.100';

      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'offline');

      expect(mockDriver.ip).toBeUndefined();
    });

    it('should send driver:disconnected IPC message when driver goes offline', () => {
      mockDriver.state = 'connected';

      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'offline');

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'driver:disconnected',
        expect.objectContaining({
          id: 'rgfx-driver-0001',
        }),
      );
    });

    it('should send system:status IPC message when driver goes offline', async () => {
      mockDriver.state = 'connected';

      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'offline');

      // Wait for async sendSystemStatus() to complete
      await vi.waitFor(() => {
        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          'system:status',
          expect.objectContaining({
            driversConnected: expect.any(Number),
          }),
        );
      });
    });

    it('should call getFullStatus when driver goes offline', () => {
      mockDriver.state = 'connected';

      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'offline');

      expect(mockSystemMonitor.getFullStatus).toHaveBeenCalled();
    });

    it('should NOT process offline if driver was already disconnected', () => {
      mockDriver.state = 'disconnected';

      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'offline');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('online status handling', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
      });
    });

    it('should NOT send IPC messages for online status (handled by telemetry)', () => {
      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'online');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should NOT modify driver state for online status', () => {
      const originalIp = mockDriver.ip;

      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'online');

      expect(mockDriver.ip).toBe(originalIp);
    });
  });

  describe('unknown driver handling', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
      });
    });

    it('should not throw for unknown driver', () => {
      mockDriverRegistry.getDriverByMac.mockReturnValue(undefined);

      expect(() => {
        mqttMock.triggerMessage('rgfx/driver/FF:FF:FF:FF:FF:FF/status', 'offline');
      }).not.toThrow();
    });

    it('should not send IPC messages for unknown driver', () => {
      mockDriverRegistry.getDriverByMac.mockReturnValue(undefined);
      mqttMock.triggerMessage('rgfx/driver/FF:FF:FF:FF:FF:FF/status', 'offline');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('window availability', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
      });
    });

    it('should not send IPC message if window is destroyed', () => {
      mockDriver.state = 'connected';
      mockMainWindow.isDestroyed.mockReturnValue(true);

      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'offline');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not send IPC message if window is null', () => {
      subscribeDriverStatus({
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => null,
        systemMonitor: mockSystemMonitor,
      });

      const callback = mqttMock.mockMqtt.subscribe.mock.calls[1][1] as (
        topic: string,
        payload: string,
      ) => void;
      mockDriver.state = 'connected';
      callback('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'offline');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('unexpected payload values', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
      });
    });

    it('should ignore unexpected payload values', () => {
      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'unknown');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should ignore empty payload', () => {
      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', '');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should handle whitespace payload', () => {
      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', '  ');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('state preservation', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
      });
    });

    it('should preserve driver ID when going offline', () => {
      const originalId = mockDriver.id;
      mockDriver.state = 'connected';

      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'offline');

      expect(mockDriver.id).toBe(originalId);
    });

    it('should preserve driver MAC when going offline', () => {
      const originalMac = mockDriver.mac;
      mockDriver.state = 'connected';

      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'offline');

      expect(mockDriver.mac).toBe(originalMac);
    });

    it('should preserve telemetry data when going offline', () => {
      const originalTelemetry = { ...mockDriver.telemetry };
      mockDriver.state = 'connected';

      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'offline');

      expect(mockDriver.telemetry).toEqual(originalTelemetry);
    });
  });

  describe('OTA state handling', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
      });
    });

    it('should ignore LWT offline message when driver state is updating', () => {
      // Driver is in 'updating' state (OTA in progress)
      mockDriver.state = 'updating';
      mockDriver.ip = '192.168.1.100';

      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'offline');

      // Driver should remain in updating state during OTA
      expect(mockDriver.state).toBe('updating');
      expect(mockDriver.ip).toBe('192.168.1.100');
      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should process offline normally when driver state is connected', () => {
      mockDriver.state = 'connected';

      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'offline');

      expect(mockDriver.state).toBe('disconnected');
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'driver:disconnected',
        expect.any(Object),
      );
    });

    it('should not process offline if driver already disconnected', () => {
      mockDriver.state = 'disconnected';

      mqttMock.triggerMessage('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'offline');

      // Should not send notification since driver was already disconnected
      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });
});
