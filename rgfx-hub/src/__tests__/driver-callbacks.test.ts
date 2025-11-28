/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerDriverCallbacks } from '../driver-callbacks';
import type { DriverRegistry } from '../driver-registry';
import type { DriverPersistence } from '../driver-persistence';
import type { SystemMonitor } from '../system-monitor';
import type { MqttBroker } from '../mqtt';
import type { BrowserWindow } from 'electron';
import type { Driver, SystemStatus } from '../types';
import type { PersistedDriver } from '../driver-persistence';

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('registerDriverCallbacks', () => {
  let mockDriverRegistry: {
    onDriverConnected: ReturnType<typeof vi.fn>;
    onDriverDisconnected: ReturnType<typeof vi.fn>;
    getConnectedCount: ReturnType<typeof vi.fn>;
  };
  let mockDriverPersistence: {
    getDriver: ReturnType<typeof vi.fn>;
  };
  let mockSystemMonitor: {
    getSystemStatus: ReturnType<typeof vi.fn>;
  };
  let mockMqtt: {
    publish: ReturnType<typeof vi.fn>;
  };
  let mockMainWindow: {
    isDestroyed: ReturnType<typeof vi.fn>;
    webContents: {
      send: ReturnType<typeof vi.fn>;
    };
  };
  let mockGetMainWindow: ReturnType<typeof vi.fn>;
  let mockGetEventsProcessed: ReturnType<typeof vi.fn>;
  let mockUploadConfigToDriver: ReturnType<typeof vi.fn>;
  let mockDriver: Driver;

  let onDriverConnectedCallback: (driver: Driver) => void;
  let onDriverDisconnectedCallback: (driver: Driver) => void;

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

    mockDriverRegistry = {
      onDriverConnected: vi.fn((callback: (driver: Driver) => void) => {
        onDriverConnectedCallback = callback;
      }),
      onDriverDisconnected: vi.fn((callback: (driver: Driver) => void) => {
        onDriverDisconnectedCallback = callback;
      }),
      getConnectedCount: vi.fn(() => 1),
    };

    mockDriverPersistence = {
      getDriver: vi.fn(() => null),
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

    mockMqtt = {
      publish: vi.fn(() => Promise.resolve()),
    };

    mockMainWindow = {
      isDestroyed: vi.fn(() => false),
      webContents: {
        send: vi.fn(),
      },
    };

    mockGetMainWindow = vi.fn(() => mockMainWindow as unknown as BrowserWindow);
    mockGetEventsProcessed = vi.fn(() => 100);
    mockUploadConfigToDriver = vi.fn(() => Promise.resolve());

    registerDriverCallbacks({
      driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
      driverPersistence: mockDriverPersistence as unknown as DriverPersistence,
      systemMonitor: mockSystemMonitor as unknown as SystemMonitor,
      mqtt: mockMqtt as unknown as MqttBroker,
      getMainWindow: mockGetMainWindow,
      getEventsProcessed: mockGetEventsProcessed,
      uploadConfigToDriver: mockUploadConfigToDriver,
    });
  });

  describe('callback registration', () => {
    it('should register onDriverConnected callback', () => {
      expect(mockDriverRegistry.onDriverConnected).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should register onDriverDisconnected callback', () => {
      expect(mockDriverRegistry.onDriverDisconnected).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('onDriverConnected', () => {
    describe('IPC messaging', () => {
      it('should send driver:connected IPC message', () => {
        onDriverConnectedCallback(mockDriver);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          'driver:connected',
          expect.objectContaining({
            id: 'rgfx-driver-0001',
          }),
        );
      });

      it('should send system:status IPC message after driver:connected', () => {
        onDriverConnectedCallback(mockDriver);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          'system:status',
          expect.objectContaining({
            driversConnected: expect.any(Number),
          }),
        );
      });

      it('should not send IPC if window is destroyed', () => {
        mockMainWindow.isDestroyed.mockReturnValue(true);

        onDriverConnectedCallback(mockDriver);

        expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
      });

      it('should not send IPC if window is null', () => {
        mockGetMainWindow.mockReturnValue(null);

        onDriverConnectedCallback(mockDriver);

        expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
      });
    });

    describe('config upload', () => {
      it('should upload config to driver with MAC address', () => {
        onDriverConnectedCallback(mockDriver);

        expect(mockUploadConfigToDriver).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
      });

      it('should not upload config if driver has no MAC', () => {
        mockDriver.mac = undefined;
        onDriverConnectedCallback(mockDriver);

        expect(mockUploadConfigToDriver).not.toHaveBeenCalled();
      });

      it('should handle config upload errors gracefully', () => {
        mockUploadConfigToDriver.mockRejectedValue(new Error('Upload failed'));

        expect(() => {
          onDriverConnectedCallback(mockDriver);
        }).not.toThrow();
      });
    });

    describe('remote logging configuration', () => {
      it('should publish logging config to driver', async () => {
        onDriverConnectedCallback(mockDriver);

        await vi.waitFor(() => {
          expect(mockMqtt.publish).toHaveBeenCalledWith(
            'rgfx/driver/AA:BB:CC:DD:EE:FF/logging',
            JSON.stringify({ level: 'off' }),
          );
        });
      });

      it('should use persisted logging level if available', async () => {
        const persistedDriver: PersistedDriver = {
          id: 'rgfx-driver-0001',
          macAddress: 'AA:BB:CC:DD:EE:FF',
          remoteLogging: 'all',
        };
        mockDriverPersistence.getDriver.mockReturnValue(persistedDriver);

        onDriverConnectedCallback(mockDriver);

        await vi.waitFor(() => {
          expect(mockMqtt.publish).toHaveBeenCalledWith(
            'rgfx/driver/AA:BB:CC:DD:EE:FF/logging',
            JSON.stringify({ level: 'all' }),
          );
        });
      });

      it('should default to "off" if no persisted driver exists', async () => {
        mockDriverPersistence.getDriver.mockReturnValue(null);

        onDriverConnectedCallback(mockDriver);

        await vi.waitFor(() => {
          expect(mockMqtt.publish).toHaveBeenCalledWith(
            'rgfx/driver/AA:BB:CC:DD:EE:FF/logging',
            JSON.stringify({ level: 'off' }),
          );
        });
      });

      it('should not publish logging config if driver has no MAC', () => {
        mockDriver.mac = undefined;
        onDriverConnectedCallback(mockDriver);

        expect(mockMqtt.publish).not.toHaveBeenCalled();
      });

      it('should handle MQTT publish errors gracefully', () => {
        mockMqtt.publish.mockRejectedValue(new Error('MQTT error'));

        expect(() => {
          onDriverConnectedCallback(mockDriver);
        }).not.toThrow();
      });
    });

    describe('system status', () => {
      it('should call getSystemStatus with current counts', () => {
        mockDriverRegistry.getConnectedCount.mockReturnValue(3);
        mockGetEventsProcessed.mockReturnValue(500);

        onDriverConnectedCallback(mockDriver);

        expect(mockSystemMonitor.getSystemStatus).toHaveBeenCalledWith(3, 500);
      });
    });
  });

  describe('onDriverDisconnected', () => {
    describe('IPC messaging', () => {
      it('should send driver:disconnected IPC message', () => {
        onDriverDisconnectedCallback(mockDriver);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          'driver:disconnected',
          expect.objectContaining({
            id: 'rgfx-driver-0001',
          }),
        );
      });

      it('should send system:status IPC message after driver:disconnected', () => {
        onDriverDisconnectedCallback(mockDriver);

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          'system:status',
          expect.objectContaining({
            driversConnected: expect.any(Number),
          }),
        );
      });

      it('should not send IPC if window is destroyed', () => {
        mockMainWindow.isDestroyed.mockReturnValue(true);

        onDriverDisconnectedCallback(mockDriver);

        expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
      });

      it('should not send IPC if window is null', () => {
        mockGetMainWindow.mockReturnValue(null);

        onDriverDisconnectedCallback(mockDriver);

        expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
      });
    });

    describe('system status', () => {
      it('should call getSystemStatus with current counts', () => {
        mockDriverRegistry.getConnectedCount.mockReturnValue(0);
        mockGetEventsProcessed.mockReturnValue(200);

        onDriverDisconnectedCallback(mockDriver);

        expect(mockSystemMonitor.getSystemStatus).toHaveBeenCalledWith(0, 200);
      });
    });
  });

  describe('driver serialization', () => {
    it('should serialize driver correctly for IPC on connect', () => {
      onDriverConnectedCallback(mockDriver);

      const sentDriver = mockMainWindow.webContents.send.mock.calls.find(
        (call) => call[0] === 'driver:connected',
      )?.[1] as Driver;

      expect(sentDriver.id).toBe('rgfx-driver-0001');
      expect(sentDriver.mac).toBe('AA:BB:CC:DD:EE:FF');
      expect(sentDriver.ip).toBe('192.168.1.100');
      expect(sentDriver.connected).toBe(true);
    });

    it('should serialize driver correctly for IPC on disconnect', () => {
      onDriverDisconnectedCallback(mockDriver);

      const sentDriver = mockMainWindow.webContents.send.mock.calls.find(
        (call) => call[0] === 'driver:disconnected',
      )?.[1] as Driver;

      expect(sentDriver.id).toBe('rgfx-driver-0001');
      expect(sentDriver.mac).toBe('AA:BB:CC:DD:EE:FF');
    });
  });
});
