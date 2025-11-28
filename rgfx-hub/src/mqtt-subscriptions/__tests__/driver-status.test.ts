/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { subscribeDriverStatus } from '../driver-status';
import type { MqttBroker } from '../../mqtt';
import type { DriverRegistry } from '../../driver-registry';
import type { SystemMonitor } from '../../system-monitor';
import type { BrowserWindow } from 'electron';
import type { Driver, SystemStatus } from '../../types';

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('subscribeDriverStatus', () => {
  let mockMqtt: {
    subscribe: ReturnType<typeof vi.fn>;
  };
  let mockDriverRegistry: {
    getDriver: ReturnType<typeof vi.fn>;
    getConnectedCount: ReturnType<typeof vi.fn>;
  };
  let mockSystemMonitor: {
    getSystemStatus: ReturnType<typeof vi.fn>;
  };
  let mockMainWindow: {
    isDestroyed: ReturnType<typeof vi.fn>;
    webContents: {
      send: ReturnType<typeof vi.fn>;
    };
  };
  let subscribedCallback: (topic: string, payload: string) => void;
  let mockDriver: Driver;
  let mockGetEventsProcessed: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDriver = {
      id: 'rgfx-driver-0001',
      mac: 'AA:BB:CC:DD:EE:FF',
      ip: '192.168.1.100',
      hostname: 'test-host',
      ssid: 'TestNetwork',
      rssi: -50,
      connected: true,
      lastSeen: Date.now(),
      failedHeartbeats: 0,
      testActive: false,
      stats: {
        mqttMessagesReceived: 1,
        mqttMessagesFailed: 0,
        udpMessagesSent: 0,
        udpMessagesFailed: 0,
      },
      telemetry: {
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
      },
    };

    mockMqtt = {
      subscribe: vi.fn((topic: string, callback: (topic: string, payload: string) => void) => {
        subscribedCallback = callback;
      }),
    };

    mockDriverRegistry = {
      getDriver: vi.fn(() => mockDriver),
      getConnectedCount: vi.fn(() => 1),
    };

    const mockStatus: SystemStatus = {
      mqttBroker: 'running',
      udpServer: 'active',
      eventReader: 'monitoring',
      driversConnected: 1,
      hubIp: '192.168.1.1',
      eventsProcessed: 100,
      hubStartTime: Date.now(),
      currentFirmwareVersion: '1.0.0',
    };

    mockSystemMonitor = {
      getSystemStatus: vi.fn(() => mockStatus),
    };

    mockMainWindow = {
      isDestroyed: vi.fn(() => false),
      webContents: {
        send: vi.fn(),
      },
    };

    mockGetEventsProcessed = vi.fn(() => 100);
  });

  describe('subscription setup', () => {
    it('should subscribe to correct MQTT topic pattern', () => {
      subscribeDriverStatus({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
        systemMonitor: mockSystemMonitor as unknown as SystemMonitor,
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
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
        systemMonitor: mockSystemMonitor as unknown as SystemMonitor,
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
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
        systemMonitor: mockSystemMonitor as unknown as SystemMonitor,
        getEventsProcessed: mockGetEventsProcessed,
      });
    });

    it('should clear driver IP when receiving offline status', () => {
      mockDriver.connected = true;
      mockDriver.ip = '192.168.1.100';

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockDriver.ip).toBeUndefined();
    });

    it('should send driver:disconnected IPC message when driver goes offline', () => {
      mockDriver.connected = true;

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'driver:disconnected',
        expect.objectContaining({
          id: 'rgfx-driver-0001',
        }),
      );
    });

    it('should send system:status IPC message when driver goes offline', () => {
      mockDriver.connected = true;

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'system:status',
        expect.objectContaining({
          driversConnected: expect.any(Number),
        }),
      );
    });

    it('should call getSystemStatus with current driver count and events', () => {
      mockDriver.connected = true;
      mockDriverRegistry.getConnectedCount.mockReturnValue(2);
      mockGetEventsProcessed.mockReturnValue(500);

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockSystemMonitor.getSystemStatus).toHaveBeenCalledWith(2, 500);
    });

    it('should NOT process offline if driver was already disconnected', () => {
      mockDriver.connected = false;

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('online status handling', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
        systemMonitor: mockSystemMonitor as unknown as SystemMonitor,
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
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
        systemMonitor: mockSystemMonitor as unknown as SystemMonitor,
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
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
        systemMonitor: mockSystemMonitor as unknown as SystemMonitor,
        getEventsProcessed: mockGetEventsProcessed,
      });
    });

    it('should not send IPC message if window is destroyed', () => {
      mockDriver.connected = true;
      mockMainWindow.isDestroyed.mockReturnValue(true);

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not send IPC message if window is null', () => {
      subscribeDriverStatus({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => null,
        systemMonitor: mockSystemMonitor as unknown as SystemMonitor,
        getEventsProcessed: mockGetEventsProcessed,
      });

      const callback = mockMqtt.subscribe.mock.calls[1][1] as (
        topic: string,
        payload: string,
      ) => void;
      mockDriver.connected = true;
      callback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('unexpected payload values', () => {
    beforeEach(() => {
      subscribeDriverStatus({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
        systemMonitor: mockSystemMonitor as unknown as SystemMonitor,
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
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
        systemMonitor: mockSystemMonitor as unknown as SystemMonitor,
        getEventsProcessed: mockGetEventsProcessed,
      });
    });

    it('should preserve driver ID when going offline', () => {
      const originalId = mockDriver.id;
      mockDriver.connected = true;

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockDriver.id).toBe(originalId);
    });

    it('should preserve driver MAC when going offline', () => {
      const originalMac = mockDriver.mac;
      mockDriver.connected = true;

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockDriver.mac).toBe(originalMac);
    });

    it('should preserve telemetry data when going offline', () => {
      const originalTelemetry = { ...mockDriver.telemetry };
      mockDriver.connected = true;

      subscribedCallback('rgfx/driver/rgfx-driver-0001/status', 'offline');

      expect(mockDriver.telemetry).toEqual(originalTelemetry);
    });
  });
});
