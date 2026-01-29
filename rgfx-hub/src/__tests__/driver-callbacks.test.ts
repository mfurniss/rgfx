/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setupDriverEventHandlers } from '../driver-callbacks';
import type { DriverRegistry } from '../driver-registry';
import type { DriverConfig } from '../driver-config';
import type { SystemMonitor } from '../system-monitor';
import type { MqttBroker } from '../network';
import type { BrowserWindow } from 'electron';
import type { Driver, SystemStatus } from '../types';
import type { ConfiguredDriver } from '../driver-config';
import { eventBus } from '../services/event-bus';

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('setupDriverEventHandlers', () => {
  let mockDriverRegistry: {
    getConnectedCount: ReturnType<typeof vi.fn>;
    getAllDrivers: ReturnType<typeof vi.fn>;
  };
  let mockDriverConfig: {
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
      isDestroyed: ReturnType<typeof vi.fn>;
    };
  };
  let mockGetMainWindow: ReturnType<typeof vi.fn>;
  let mockGetEventsProcessed: ReturnType<typeof vi.fn>;
  let mockUploadConfigToDriver: ReturnType<typeof vi.fn>;
  let mockDriver: Driver;

  // Track event handlers for cleanup
  const eventHandlers: { event: string; handler: any }[] = [];
  const originalOn = eventBus.on.bind(eventBus);

  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers.length = 0;

    // Wrap eventBus.on to track handlers for cleanup
    vi.spyOn(eventBus, 'on').mockImplementation((event: any, handler: any) => {
      eventHandlers.push({ event, handler });
      originalOn(event, handler);
    });

    mockDriver = {
      id: 'rgfx-driver-0001',
      mac: 'AA:BB:CC:DD:EE:FF',
      ip: '192.168.1.100',
      hostname: 'test-host',
      ssid: 'TestNetwork',
      rssi: -50,
      state: 'connected',
      lastSeen: Date.now(),
      failedHeartbeats: 0,
      testActive: false,
      disabled: false,
      stats: {
        telemetryEventsReceived: 1,
        mqttMessagesReceived: 1,
        mqttMessagesFailed: 0,
      },
      telemetry: {
        chipModel: 'ESP32',
        chipRevision: 1,
        chipCores: 2,
        cpuFreqMHz: 240,
        flashSize: 4194304,
        flashSpeed: 40000000,
        heapSize: 327680,
        maxAllocHeap: 200000,
        psramSize: 0,
        freePsram: 0,
        sdkVersion: 'v4.4',
        sketchSize: 1000000,
        freeSketchSpace: 2000000,
        currentFps: 120.0,
        minFps: 118.0,
        maxFps: 122.0,
      },
    };

    mockDriverRegistry = {
      getConnectedCount: vi.fn(() => 1),
      getAllDrivers: vi.fn(() => [mockDriver]),
    };

    mockDriverConfig = {
      getDriver: vi.fn(() => null),
    };

    const mockStatus: SystemStatus = {
      mqttBroker: 'running',
      udpServer: 'active',
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
        isDestroyed: vi.fn(() => false),
      },
    };

    mockGetMainWindow = vi.fn(() => mockMainWindow as unknown as BrowserWindow);
    mockGetEventsProcessed = vi.fn(() => 100);
    mockUploadConfigToDriver = vi.fn(() => Promise.resolve());

    setupDriverEventHandlers({
      driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
      driverConfig: mockDriverConfig as unknown as DriverConfig,
      systemMonitor: mockSystemMonitor as unknown as SystemMonitor,
      mqtt: mockMqtt as unknown as MqttBroker,
      getMainWindow: mockGetMainWindow,
      getEventsProcessed: mockGetEventsProcessed,
      getEventLogSizeBytes: vi.fn(() => 0),
      getSystemErrors: vi.fn(() => []),
      uploadConfigToDriver: mockUploadConfigToDriver,
    });
  });

  afterEach(() => {
    // Clean up event handlers
    for (const { event, handler } of eventHandlers) {
      eventBus.off(event as any, handler);
    }
    vi.restoreAllMocks();
  });

  describe('event subscription', () => {
    it('should subscribe to driver:connected event', () => {
      expect(eventBus.on).toHaveBeenCalledWith('driver:connected', expect.any(Function));
    });

    it('should subscribe to driver:disconnected event', () => {
      expect(eventBus.on).toHaveBeenCalledWith('driver:disconnected', expect.any(Function));
    });

    it('should subscribe to driver:updated event', () => {
      expect(eventBus.on).toHaveBeenCalledWith('driver:updated', expect.any(Function));
    });
  });

  describe('driver:connected event', () => {
    describe('IPC messaging', () => {
      it('should send driver:connected IPC message', () => {
        eventBus.emit('driver:connected', { driver: mockDriver as any });

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          'driver:connected',
          expect.objectContaining({
            id: 'rgfx-driver-0001',
          }),
        );
      });

      it('should send system:status IPC message after driver:connected', async () => {
        eventBus.emit('driver:connected', { driver: mockDriver as any });

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

      it('should not send IPC if window is destroyed', () => {
        mockMainWindow.isDestroyed.mockReturnValue(true);

        eventBus.emit('driver:connected', { driver: mockDriver as any });

        expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
      });

      it('should not send IPC if window is null', () => {
        mockGetMainWindow.mockReturnValue(null);

        eventBus.emit('driver:connected', { driver: mockDriver as any });

        expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
      });
    });

    describe('config upload', () => {
      it('should upload config to driver with MAC address', () => {
        eventBus.emit('driver:connected', { driver: mockDriver as any });

        expect(mockUploadConfigToDriver).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
      });

      it('should not upload config if driver has no MAC', () => {
        mockDriver.mac = undefined;
        eventBus.emit('driver:connected', { driver: mockDriver as any });

        expect(mockUploadConfigToDriver).not.toHaveBeenCalled();
      });

      it('should handle config upload errors gracefully', () => {
        mockUploadConfigToDriver.mockRejectedValue(new Error('Upload failed'));

        expect(() => {
          eventBus.emit('driver:connected', { driver: mockDriver as any });
        }).not.toThrow();
      });
    });

    describe('remote logging configuration', () => {
      it('should publish logging config to driver', async () => {
        eventBus.emit('driver:connected', { driver: mockDriver as any });

        await vi.waitFor(() => {
          expect(mockMqtt.publish).toHaveBeenCalledWith(
            'rgfx/driver/AA:BB:CC:DD:EE:FF/logging',
            JSON.stringify({ level: 'off' }),
          );
        });
      });

      it('should use persisted logging level if available', async () => {
        const configuredDriver: ConfiguredDriver = {
          id: 'rgfx-driver-0001',
          macAddress: 'AA:BB:CC:DD:EE:FF',
          remoteLogging: 'all',
          disabled: false,
        };
        mockDriverConfig.getDriver.mockReturnValue(configuredDriver);

        eventBus.emit('driver:connected', { driver: mockDriver as any });

        await vi.waitFor(() => {
          expect(mockMqtt.publish).toHaveBeenCalledWith(
            'rgfx/driver/AA:BB:CC:DD:EE:FF/logging',
            JSON.stringify({ level: 'all' }),
          );
        });
      });

      it('should default to "off" if no persisted driver exists', async () => {
        mockDriverConfig.getDriver.mockReturnValue(null);

        eventBus.emit('driver:connected', { driver: mockDriver as any });

        await vi.waitFor(() => {
          expect(mockMqtt.publish).toHaveBeenCalledWith(
            'rgfx/driver/AA:BB:CC:DD:EE:FF/logging',
            JSON.stringify({ level: 'off' }),
          );
        });
      });

      it('should not publish logging config if driver has no MAC', () => {
        mockDriver.mac = undefined;
        eventBus.emit('driver:connected', { driver: mockDriver as any });

        expect(mockMqtt.publish).not.toHaveBeenCalled();
      });

      it('should handle MQTT publish errors gracefully', () => {
        mockMqtt.publish.mockRejectedValue(new Error('MQTT error'));

        expect(() => {
          eventBus.emit('driver:connected', { driver: mockDriver as any });
        }).not.toThrow();
      });
    });

    describe('system status', () => {
      it('should call getSystemStatus with current counts and errors', () => {
        mockDriverRegistry.getConnectedCount.mockReturnValue(3);
        const fourDrivers = [mockDriver, mockDriver, mockDriver, mockDriver];
        mockDriverRegistry.getAllDrivers.mockReturnValue(fourDrivers);
        mockGetEventsProcessed.mockReturnValue(500);

        eventBus.emit('driver:connected', { driver: mockDriver as any });

        expect(mockSystemMonitor.getSystemStatus).toHaveBeenCalledWith(3, 4, 500, 0, []);
      });
    });
  });

  describe('system errors', () => {
    it('should pass system errors to getSystemStatus', () => {
      // Clean up existing handlers
      for (const { event, handler } of eventHandlers) {
        eventBus.off(event as any, handler);
      }
      eventHandlers.length = 0;

      const mockErrors = [
        { errorType: 'interceptor' as const, message: 'Test error', timestamp: Date.now() },
      ];
      const mockGetSystemErrors = vi.fn(() => mockErrors);

      setupDriverEventHandlers({
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        driverConfig: mockDriverConfig as unknown as DriverConfig,
        systemMonitor: mockSystemMonitor as unknown as SystemMonitor,
        mqtt: mockMqtt as unknown as MqttBroker,
        getMainWindow: mockGetMainWindow,
        getEventsProcessed: mockGetEventsProcessed,
        getEventLogSizeBytes: vi.fn(() => 0),
        getSystemErrors: mockGetSystemErrors,
        uploadConfigToDriver: mockUploadConfigToDriver,
      });

      eventBus.emit('driver:connected', { driver: mockDriver as any });

      expect(mockSystemMonitor.getSystemStatus).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        mockErrors,
      );
    });
  });

  describe('driver:disconnected event', () => {
    describe('IPC messaging', () => {
      it('should send driver:disconnected IPC message with reason', () => {
        eventBus.emit('driver:disconnected', { driver: mockDriver as any, reason: 'disconnected' });

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          'driver:disconnected',
          expect.objectContaining({
            id: 'rgfx-driver-0001',
          }),
          'disconnected',
        );
      });

      it('should send driver:disconnected IPC message with restarting reason', () => {
        eventBus.emit('driver:disconnected', { driver: mockDriver as any, reason: 'restarting' });

        expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
          'driver:disconnected',
          expect.objectContaining({
            id: 'rgfx-driver-0001',
          }),
          'restarting',
        );
      });

      it('should send system:status IPC message after driver:disconnected', async () => {
        eventBus.emit('driver:disconnected', { driver: mockDriver as any, reason: 'disconnected' });

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

      it('should not send IPC if window is destroyed', () => {
        mockMainWindow.isDestroyed.mockReturnValue(true);

        eventBus.emit('driver:disconnected', { driver: mockDriver as any, reason: 'disconnected' });

        expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
      });

      it('should not send IPC if window is null', () => {
        mockGetMainWindow.mockReturnValue(null);

        eventBus.emit('driver:disconnected', { driver: mockDriver as any, reason: 'disconnected' });

        expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
      });
    });

    describe('system status', () => {
      it('should call getSystemStatus with current counts and errors', () => {
        mockDriverRegistry.getConnectedCount.mockReturnValue(0);
        mockDriverRegistry.getAllDrivers.mockReturnValue([mockDriver]);
        mockGetEventsProcessed.mockReturnValue(200);

        eventBus.emit('driver:disconnected', { driver: mockDriver as any, reason: 'disconnected' });

        expect(mockSystemMonitor.getSystemStatus).toHaveBeenCalledWith(0, 1, 200, 0, []);
      });
    });
  });

  describe('driver:updated event', () => {
    it('should send driver:updated IPC message', () => {
      eventBus.emit('driver:updated', { driver: mockDriver as any });

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'driver:updated',
        expect.objectContaining({
          id: 'rgfx-driver-0001',
        }),
      );
    });

    it('should not send IPC if window is destroyed', () => {
      mockMainWindow.isDestroyed.mockReturnValue(true);

      eventBus.emit('driver:updated', { driver: mockDriver as any });

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not send IPC if window is null', () => {
      mockGetMainWindow.mockReturnValue(null);

      eventBus.emit('driver:updated', { driver: mockDriver as any });

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('driver serialization', () => {
    it('should serialize driver correctly for IPC on connect', () => {
      eventBus.emit('driver:connected', { driver: mockDriver as any });

      const sentDriver = mockMainWindow.webContents.send.mock.calls.find(
        (call) => call[0] === 'driver:connected',
      )?.[1] as Driver;

      expect(sentDriver.id).toBe('rgfx-driver-0001');
      expect(sentDriver.mac).toBe('AA:BB:CC:DD:EE:FF');
      expect(sentDriver.ip).toBe('192.168.1.100');
      expect(sentDriver.state === 'connected').toBe(true);
    });

    it('should serialize driver correctly for IPC on disconnect', () => {
      eventBus.emit('driver:disconnected', { driver: mockDriver as any, reason: 'disconnected' });

      const sentDriver = mockMainWindow.webContents.send.mock.calls.find(
        (call) => call[0] === 'driver:disconnected',
      )?.[1] as Driver;

      expect(sentDriver.id).toBe('rgfx-driver-0001');
      expect(sentDriver.mac).toBe('AA:BB:CC:DD:EE:FF');
    });
  });

  describe('flash:ota:state event', () => {
    it('should subscribe to flash:ota:state event', () => {
      expect(eventBus.on).toHaveBeenCalledWith('flash:ota:state', expect.any(Function));
    });

    it('should send flash:ota:state IPC message', () => {
      const stateData = { driverId: 'rgfx-driver-0001', state: 'uploading' };
      eventBus.emit('flash:ota:state', stateData);

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('flash:ota:state', stateData);
    });

    it('should not send IPC if window is destroyed', () => {
      mockMainWindow.isDestroyed.mockReturnValue(true);

      eventBus.emit('flash:ota:state', { driverId: 'rgfx-driver-0001', state: 'uploading' });

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not send IPC if window is null', () => {
      mockGetMainWindow.mockReturnValue(null);

      eventBus.emit('flash:ota:state', { driverId: 'rgfx-driver-0001', state: 'uploading' });

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('flash:ota:progress event', () => {
    it('should subscribe to flash:ota:progress event', () => {
      expect(eventBus.on).toHaveBeenCalledWith('flash:ota:progress', expect.any(Function));
    });

    it('should send flash:ota:progress IPC message', () => {
      const progressData = { driverId: 'rgfx-driver-0001', sent: 512000, total: 1024000, percent: 50 };
      eventBus.emit('flash:ota:progress', progressData);

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('flash:ota:progress', progressData);
    });

    it('should not send IPC if window is destroyed', () => {
      mockMainWindow.isDestroyed.mockReturnValue(true);

      eventBus.emit('flash:ota:progress', { driverId: 'rgfx-driver-0001', sent: 512000, total: 1024000, percent: 50 });

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not send IPC if window is null', () => {
      mockGetMainWindow.mockReturnValue(null);

      eventBus.emit('flash:ota:progress', { driverId: 'rgfx-driver-0001', sent: 512000, total: 1024000, percent: 50 });

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('flash:ota:error event', () => {
    it('should subscribe to flash:ota:error event', () => {
      expect(eventBus.on).toHaveBeenCalledWith('flash:ota:error', expect.any(Function));
    });

    it('should send flash:ota:error IPC message', () => {
      const errorData = { driverId: 'rgfx-driver-0001', error: 'Connection timeout' };
      eventBus.emit('flash:ota:error', errorData);

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith('flash:ota:error', errorData);
    });

    it('should not send IPC if window is destroyed', () => {
      mockMainWindow.isDestroyed.mockReturnValue(true);

      eventBus.emit('flash:ota:error', { driverId: 'rgfx-driver-0001', error: 'Connection timeout' });

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not send IPC if window is null', () => {
      mockGetMainWindow.mockReturnValue(null);

      eventBus.emit('flash:ota:error', { driverId: 'rgfx-driver-0001', error: 'Connection timeout' });

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });
});
