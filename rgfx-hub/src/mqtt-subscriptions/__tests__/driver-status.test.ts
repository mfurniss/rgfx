/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, mockDeep, type MockProxy, type DeepMockProxy } from 'vitest-mock-extended';
import { subscribeDriverStatus } from '../driver-status';
import type { MqttBroker } from '@/network';
import type { DriverRegistry } from '@/driver-registry';
import type { SystemMonitor } from '@/system-monitor';
import type { BrowserWindow } from 'electron';
import { Driver, type SystemStatus } from '@/types';
import { createMockDriver } from '@/__tests__/factories';

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));


describe('subscribeDriverStatus', () => {
  let mockMqtt: MockProxy<MqttBroker>;
  let mockDriverRegistry: MockProxy<DriverRegistry>;
  let mockSystemMonitor: MockProxy<SystemMonitor>;
  let mockMainWindow: DeepMockProxy<BrowserWindow>;
  let subscribedCallback: (topic: string, payload: string) => void;
  let mockDriver: Driver;
  let mockGetEventsProcessed: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDriver = createMockDriver();

    mockMqtt = mock<MqttBroker>();
    mockMqtt.subscribe.mockImplementation(
      (topic: string, callback: (topic: string, payload: string) => void) => {
        subscribedCallback = callback;
      },
    );

    mockDriverRegistry = mock<DriverRegistry>();
    mockDriverRegistry.getDriver.mockReturnValue(mockDriver);
    mockDriverRegistry.getConnectedCount.mockReturnValue(1);
    mockDriverRegistry.getAllDrivers.mockReturnValue([mockDriver]);

    const mockStatus: SystemStatus = {
      mqttBroker: 'running',
      udpServer: 'active',
      eventReader: 'monitoring',
      driversConnected: 1,
      driversTotal: 1,
      hubIp: '192.168.1.1',
      eventsProcessed: 100,
      hubStartTime: Date.now(),
      currentFirmwareVersion: '1.0.0',
    };

    mockSystemMonitor = mock<SystemMonitor>();
    mockSystemMonitor.getSystemStatus.mockReturnValue(mockStatus);

    mockMainWindow = mockDeep<BrowserWindow>();
    mockMainWindow.isDestroyed.mockReturnValue(false);

    mockGetEventsProcessed = vi.fn(() => 100);
  });

  describe('subscription setup', () => {
    it('should subscribe to correct MQTT topic pattern', () => {
      subscribeDriverStatus({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
        getEventsProcessed: mockGetEventsProcessed,
      });

      expect(mockMqtt.subscribe).toHaveBeenCalledWith(
        'rgfx/driver/+/status',
        expect.any(Function),
      );
    });
  });

  describe('topic parsing', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
        getEventsProcessed: mockGetEventsProcessed,
      });
    });

    it('should extract driver ID from valid topic', () => {
      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockDriverRegistry.getDriver).toHaveBeenCalledWith('rgfx-driver-0001');
    });

    it('should extract driver ID with MAC address format', () => {
      subscribedCallback('rgfx/driver/AA:BB:CC:DD:EE:FF/status', 'offline');

      expect(mockDriverRegistry.getDriver).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    });

    it('should handle invalid topic format gracefully', () => {
      subscribedCallback('rgfx/invalid/topic', 'offline');

      expect(mockDriverRegistry.getDriver).not.toHaveBeenCalled();
    });

    it('should handle topic missing status suffix', () => {
      subscribedCallback('rgfx/driver/rgfx-driver-0001', 'offline');

      expect(mockDriverRegistry.getDriver).not.toHaveBeenCalled();
    });
  });

  describe('offline status handling (LWT)', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
        getEventsProcessed: mockGetEventsProcessed,
      });
    });

    it('should clear driver IP when receiving offline status', () => {
      mockDriver.state = 'connected';
      mockDriver.ip = '192.168.1.100';

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockDriver.ip).toBeUndefined();
    });

    it('should send driver:disconnected IPC message when driver goes offline', () => {
      mockDriver.state = 'connected';

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'driver:disconnected',
        expect.objectContaining({
          id: 'rgfx-driver-0001',
        }),
      );
    });

    it('should send system:status IPC message when driver goes offline', () => {
      mockDriver.state = 'connected';

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'system:status',
        expect.objectContaining({
          driversConnected: expect.any(Number),
        }),
      );
    });

    it('should call getSystemStatus with current driver count and events', () => {
      mockDriver.state = 'connected';
      mockDriverRegistry.getConnectedCount.mockReturnValue(2);
      mockDriverRegistry.getAllDrivers.mockReturnValue([mockDriver, mockDriver, mockDriver]);
      mockGetEventsProcessed.mockReturnValue(500);

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockSystemMonitor.getSystemStatus).toHaveBeenCalledWith(2, 3, 500);
    });

    it('should NOT process offline if driver was already disconnected', () => {
      mockDriver.state = 'disconnected';

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('online status handling', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
        getEventsProcessed: mockGetEventsProcessed,
      });
    });

    it('should NOT send IPC messages for online status (handled by telemetry)', () => {
      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'online');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should NOT modify driver state for online status', () => {
      const originalIp = mockDriver.ip;

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'online');

      expect(mockDriver.ip).toBe(originalIp);
    });
  });

  describe('unknown driver handling', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
        getEventsProcessed: mockGetEventsProcessed,
      });
    });

    it('should not throw for unknown driver', () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      expect(() => {
        subscribedCallback('rgfx/driver/unknown-driver/status', 'offline');
      }).not.toThrow();
    });

    it('should not send IPC messages for unknown driver', () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);
      subscribedCallback('rgfx/driver/unknown-driver/status', 'offline');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('window availability', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
        getEventsProcessed: mockGetEventsProcessed,
      });
    });

    it('should not send IPC message if window is destroyed', () => {
      mockDriver.state = 'connected';
      mockMainWindow.isDestroyed.mockReturnValue(true);

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not send IPC message if window is null', () => {
      subscribeDriverStatus({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => null,
        systemMonitor: mockSystemMonitor,
        getEventsProcessed: mockGetEventsProcessed,
      });

      const callback = mockMqtt.subscribe.mock.calls[1][1] as (
        topic: string,
        payload: string,
      ) => void;
      mockDriver.state = 'connected';
      callback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('unexpected payload values', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
        getEventsProcessed: mockGetEventsProcessed,
      });
    });

    it('should ignore unexpected payload values', () => {
      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'unknown');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should ignore empty payload', () => {
      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', '');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should handle whitespace payload', () => {
      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', '  ');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('state preservation', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
        getEventsProcessed: mockGetEventsProcessed,
      });
    });

    it('should preserve driver ID when going offline', () => {
      const originalId = mockDriver.id;
      mockDriver.state = 'connected';

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockDriver.id).toBe(originalId);
    });

    it('should preserve driver MAC when going offline', () => {
      const originalMac = mockDriver.mac;
      mockDriver.state = 'connected';

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockDriver.mac).toBe(originalMac);
    });

    it('should preserve telemetry data when going offline', () => {
      const originalTelemetry = { ...mockDriver.telemetry };
      mockDriver.state = 'connected';

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockDriver.telemetry).toEqual(originalTelemetry);
    });
  });

  describe('OTA state handling', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
        systemMonitor: mockSystemMonitor,
        getEventsProcessed: mockGetEventsProcessed,
      });
    });

    it('should ignore LWT offline message when driver state is updating', () => {
      // Driver is in 'updating' state (OTA in progress)
      mockDriver.state = 'updating';
      mockDriver.ip = '192.168.1.100';

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      // Driver should remain in updating state during OTA
      expect(mockDriver.state).toBe('updating');
      expect(mockDriver.ip).toBe('192.168.1.100');
      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should process offline normally when driver state is connected', () => {
      mockDriver.state = 'connected';

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockDriver.state).toBe('disconnected');
      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'driver:disconnected',
        expect.any(Object),
      );
    });

    it('should not process offline if driver already disconnected', () => {
      mockDriver.state = 'disconnected';

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      // Should not send notification since driver was already disconnected
      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });
});
