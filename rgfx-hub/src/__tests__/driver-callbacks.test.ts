import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setupDriverEventHandlers } from '../driver-callbacks';
import type { SystemMonitor } from '../system-monitor';
import type { DriverConnectService } from '../services/driver-connect-service';
import type { BrowserWindow } from 'electron';
import type { Driver, SystemStatus } from '../types';
import { eventBus } from '../services/event-bus';

describe('setupDriverEventHandlers', () => {
  let mockSystemMonitor: {
    getFullStatus: ReturnType<typeof vi.fn>;
  };
  let mockDriverConnectService: {
    onDriverConnected: ReturnType<typeof vi.fn>;
  };
  let mockMainWindow: {
    isDestroyed: ReturnType<typeof vi.fn>;
    webContents: {
      send: ReturnType<typeof vi.fn>;
      isDestroyed: ReturnType<typeof vi.fn>;
    };
  };
  let mockGetMainWindow: ReturnType<typeof vi.fn>;
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

    mockSystemMonitor = {
      getFullStatus: vi.fn(() => mockStatus),
    };

    mockDriverConnectService = {
      onDriverConnected: vi.fn(),
    };

    mockMainWindow = {
      isDestroyed: vi.fn(() => false),
      webContents: {
        send: vi.fn(),
        isDestroyed: vi.fn(() => false),
      },
    };

    mockGetMainWindow = vi.fn(() => mockMainWindow as unknown as BrowserWindow);

    setupDriverEventHandlers({
      systemMonitor: mockSystemMonitor as unknown as SystemMonitor,
      driverConnectService: mockDriverConnectService as unknown as DriverConnectService,
      getMainWindow: mockGetMainWindow,
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

    describe('driver connect service delegation', () => {
      it('should delegate to driverConnectService on connect', () => {
        eventBus.emit('driver:connected', { driver: mockDriver as any });

        expect(mockDriverConnectService.onDriverConnected)
          .toHaveBeenCalledWith(mockDriver);
      });
    });

    describe('system status', () => {
      it('should call getFullStatus after driver connects', () => {
        eventBus.emit('driver:connected', { driver: mockDriver as any });

        expect(mockSystemMonitor.getFullStatus).toHaveBeenCalled();
      });
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
      it('should call getFullStatus after driver disconnects', () => {
        eventBus.emit('driver:disconnected', { driver: mockDriver as any, reason: 'disconnected' });

        expect(mockSystemMonitor.getFullStatus).toHaveBeenCalled();
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
      const progressData = {
        driverId: 'rgfx-driver-0001', sent: 512000, total: 1024000, percent: 50,
      };
      eventBus.emit('flash:ota:progress', progressData);

      expect(mockMainWindow.webContents.send)
        .toHaveBeenCalledWith('flash:ota:progress', progressData);
    });

    it('should not send IPC if window is destroyed', () => {
      mockMainWindow.isDestroyed.mockReturnValue(true);

      eventBus.emit('flash:ota:progress', {
        driverId: 'rgfx-driver-0001', sent: 512000, total: 1024000, percent: 50,
      });

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not send IPC if window is null', () => {
      mockGetMainWindow.mockReturnValue(null);

      eventBus.emit('flash:ota:progress', {
        driverId: 'rgfx-driver-0001', sent: 512000, total: 1024000, percent: 50,
      });

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

      eventBus.emit('flash:ota:error', {
        driverId: 'rgfx-driver-0001', error: 'Connection timeout',
      });

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not send IPC if window is null', () => {
      mockGetMainWindow.mockReturnValue(null);

      eventBus.emit('flash:ota:error', {
        driverId: 'rgfx-driver-0001', error: 'Connection timeout',
      });

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });
});
