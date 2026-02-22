import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, mockDeep, type MockProxy, type DeepMockProxy } from 'vitest-mock-extended';
import { subscribeDriverTelemetry } from '../driver-telemetry';
import type { MqttBroker } from '@/network';
import type { DriverRegistry } from '@/driver-registry';
import type { BrowserWindow } from 'electron';
import { Driver } from '@/types';
import { createMockDriver, createMockTelemetryPayload } from '@/__tests__/factories';
import { eventBus } from '@/services/event-bus';

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/services/event-bus', () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

describe('subscribeDriverTelemetry', () => {
  let mockMqtt: MockProxy<MqttBroker>;
  let mockDriverRegistry: MockProxy<DriverRegistry>;
  let mockMainWindow: DeepMockProxy<BrowserWindow>;
  let subscribedCallback: (topic: string, payload: string) => void;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMqtt = mock<MqttBroker>();
    mockMqtt.subscribe.mockImplementation(
      (topic: string, callback: (topic: string, payload: string) => void) => {
        subscribedCallback = callback;
      },
    );

    mockDriverRegistry = mock<DriverRegistry>();
    mockDriverRegistry.registerDriver.mockImplementation((data) => ({
      id: 'rgfx-driver-0001',
      mac: data.mac,
      ip: data.ip,
      state: 'connected',
      telemetry: data.telemetry,
      disabled: false,
    }) as Driver);

    mockMainWindow = mockDeep<BrowserWindow>();
    mockMainWindow.isDestroyed.mockReturnValue(false);
  });

  describe('subscription setup', () => {
    it('should subscribe to correct MQTT topic', () => {
      subscribeDriverTelemetry({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
      });

      expect(mockMqtt.subscribe).toHaveBeenCalledWith(
        'rgfx/system/driver/telemetry',
        expect.any(Function),
      );
    });
  });

  describe('full telemetry handling', () => {
    beforeEach(() => {
      subscribeDriverTelemetry({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
      });
    });

    it('should register driver with full telemetry payload', () => {
      const payload = createMockTelemetryPayload();
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      expect(mockDriverRegistry.registerDriver).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: '192.168.1.100',
          mac: 'AA:BB:CC:DD:EE:FF',
          hostname: 'rgfx-driver-0001',
          telemetry: expect.objectContaining({
            chipModel: 'ESP32',
            cpuFreqMHz: 240,
          }),
        }),
      );
    });

    it('should send driver:updated IPC message after registration', () => {
      const payload = createMockTelemetryPayload();
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'driver:updated',
        expect.objectContaining({
          id: 'rgfx-driver-0001',
        }),
      );
    });

    it('should not send IPC message if window is destroyed', () => {
      mockMainWindow.isDestroyed.mockReturnValue(true);

      const payload = createMockTelemetryPayload();
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not send IPC message if window is null', () => {
      subscribeDriverTelemetry({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => null,
      });

      // Re-capture the callback
      const callback = mockMqtt.subscribe.mock.calls[1][1] as (
        topic: string,
        payload: string,
      ) => void;
      callback('rgfx/system/driver/telemetry', createMockTelemetryPayload());

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('FPS telemetry handling', () => {
    beforeEach(() => {
      subscribeDriverTelemetry({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
      });
    });

    it('should extract FPS metrics from telemetry', () => {
      const payload = createMockTelemetryPayload({
        currentFps: 45.5,
        minFps: 40.0,
        maxFps: 50.0,
      });
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      const registrationCall = mockDriverRegistry.registerDriver.mock.calls[0][0] as {
        telemetry: { currentFps: number; minFps: number; maxFps: number };
      };
      expect(registrationCall.telemetry.currentFps).toBe(45.5);
      expect(registrationCall.telemetry.minFps).toBe(40.0);
      expect(registrationCall.telemetry.maxFps).toBe(50.0);
    });

    it('should reject payload missing required FPS fields', () => {
      const payload = JSON.stringify({
        ip: '192.168.1.100',
        mac: 'AA:BB:CC:DD:EE:FF',
        hostname: 'rgfx-driver-0001',
        ssid: 'TestNetwork',
        rssi: -50,
        freeHeap: 200000,
        minFreeHeap: 180000,
        uptimeMs: 60000,
        chipModel: 'ESP32',
        chipRevision: 1,
        chipCores: 2,
        cpuFreqMHz: 240,
        flashSize: 4194304,
        flashSpeed: 40000000,
        heapSize: 327680,
        psramSize: 0,
        freePsram: 0,
        sdkVersion: 'v4.4',
        sketchSize: 1000000,
        freeSketchSpace: 2000000,
        // Missing currentFps, minFps, maxFps
      });
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      expect(mockDriverRegistry.registerDriver).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      subscribeDriverTelemetry({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
      });
    });

    it('should handle invalid JSON gracefully', () => {
      expect(() => {
        subscribedCallback('rgfx/system/driver/telemetry', 'not-json');
      }).not.toThrow();

      expect(mockDriverRegistry.registerDriver).not.toHaveBeenCalled();
    });

    it('should reject payload missing required ip field', () => {
      const payload = JSON.stringify({ mac: 'AA:BB:CC:DD:EE:FF' });
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      expect(mockDriverRegistry.registerDriver).not.toHaveBeenCalled();
    });

    it('should reject payload missing required mac field', () => {
      const payload = JSON.stringify({ ip: '192.168.1.100' });
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      expect(mockDriverRegistry.registerDriver).not.toHaveBeenCalled();
    });

    it('should reject payload with invalid mac format', () => {
      const payload = JSON.stringify({
        ip: '192.168.1.100',
        mac: 'invalid-mac',
      });
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      expect(mockDriverRegistry.registerDriver).not.toHaveBeenCalled();
    });

    it('should reject empty payload', () => {
      const payload = JSON.stringify({});
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      expect(mockDriverRegistry.registerDriver).not.toHaveBeenCalled();
    });

    it('should emit system error when payload fails both full and minimal validation', () => {
      const payload = JSON.stringify({
        ip: '192.168.1.100',
        mac: 'invalid-mac-format',
      });
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'system:error',
        expect.objectContaining({
          errorType: 'driver',
          message: 'Received invalid telemetry payload from driver',
          timestamp: expect.any(Number),
          details: expect.stringContaining('minimalErrors'),
        }),
      );
    });
  });

  describe('driver data extraction', () => {
    beforeEach(() => {
      subscribeDriverTelemetry({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
      });
    });

    it('should extract firmware version from full telemetry', () => {
      const payload = createMockTelemetryPayload({ firmwareVersion: '2.0.0' });
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      const registrationCall = mockDriverRegistry.registerDriver.mock.calls[0][0] as {
        telemetry: { firmwareVersion: string };
      };
      expect(registrationCall.telemetry.firmwareVersion).toBe('2.0.0');
    });

    it('should keep firmwareVersion undefined if not provided', () => {
      const payload = createMockTelemetryPayload({ firmwareVersion: undefined });
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      const registrationCall = mockDriverRegistry.registerDriver.mock.calls[0][0] as {
        telemetry: { firmwareVersion?: string };
      };
      expect(registrationCall.telemetry.firmwareVersion).toBeUndefined();
    });

    it('should extract testActive state if provided', () => {
      const payload = createMockTelemetryPayload({ testActive: true });
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      const registrationCall = mockDriverRegistry.registerDriver.mock.calls[0][0] as {
        testActive: boolean;
      };
      expect(registrationCall.testActive).toBe(true);
    });
  });

  describe('IPC serialization', () => {
    it('should serialize driver for IPC correctly', () => {
      const mockDriver = createMockDriver();

      mockDriverRegistry.registerDriver.mockReturnValue(mockDriver);

      subscribeDriverTelemetry({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
      });

      subscribedCallback('rgfx/system/driver/telemetry', createMockTelemetryPayload());

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'driver:updated',
        expect.objectContaining({
          id: 'rgfx-driver-0001',
          mac: 'AA:BB:CC:DD:EE:FF',
          state: 'connected',
        }),
      );
    });
  });
});
