/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { subscribeDriverTelemetry } from '../driver-telemetry';
import type { MqttBroker } from '@/network';
import type { DriverRegistry } from '@/driver-registry';
import type { BrowserWindow } from 'electron';
import type { Driver } from '@/types';

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('subscribeDriverTelemetry', () => {
  let mockMqtt: {
    subscribe: ReturnType<typeof vi.fn>;
  };
  let mockDriverRegistry: {
    registerDriver: ReturnType<typeof vi.fn>;
  };
  let mockMainWindow: {
    isDestroyed: ReturnType<typeof vi.fn>;
    webContents: {
      send: ReturnType<typeof vi.fn>;
    };
  };
  let subscribedCallback: (topic: string, payload: string) => void;

  beforeEach(() => {
    vi.clearAllMocks();

    mockMqtt = {
      subscribe: vi.fn((topic: string, callback: (topic: string, payload: string) => void) => {
        subscribedCallback = callback;
      }),
    };

    mockDriverRegistry = {
      registerDriver: vi.fn((data) => ({
        id: 'rgfx-driver-0001',
        mac: data.mac,
        ip: data.ip,
        state: 'connected',
        telemetry: data.telemetry,
      })),
    };

    mockMainWindow = {
      isDestroyed: vi.fn(() => false),
      webContents: {
        send: vi.fn(),
      },
    };
  });

  const createFullTelemetryPayload = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({
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
      hasDisplay: false,
      sdkVersion: 'v4.4',
      sketchSize: 1000000,
      freeSketchSpace: 2000000,
      firmwareVersion: '1.0.0',
      currentFps: 120.0,
      minFps: 118.0,
      maxFps: 122.0,
      ...overrides,
    });

  describe('subscription setup', () => {
    it('should subscribe to correct MQTT topic', () => {
      subscribeDriverTelemetry({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
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
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
      });
    });

    it('should register driver with full telemetry payload', () => {
      const payload = createFullTelemetryPayload();
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
      const payload = createFullTelemetryPayload();
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

      const payload = createFullTelemetryPayload();
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not send IPC message if window is null', () => {
      subscribeDriverTelemetry({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => null,
      });

      // Re-capture the callback
      const callback = mockMqtt.subscribe.mock.calls[1][1] as (
        topic: string,
        payload: string,
      ) => void;
      callback('rgfx/system/driver/telemetry', createFullTelemetryPayload());

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('FPS telemetry handling', () => {
    beforeEach(() => {
      subscribeDriverTelemetry({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
      });
    });

    it('should extract FPS metrics from telemetry', () => {
      const payload = createFullTelemetryPayload({
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
        hasDisplay: false,
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
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
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
  });

  describe('driver data extraction', () => {
    beforeEach(() => {
      subscribeDriverTelemetry({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
      });
    });

    it('should extract firmware version from full telemetry', () => {
      const payload = createFullTelemetryPayload({ firmwareVersion: '2.0.0' });
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      const registrationCall = mockDriverRegistry.registerDriver.mock.calls[0][0] as {
        telemetry: { firmwareVersion: string };
      };
      expect(registrationCall.telemetry.firmwareVersion).toBe('2.0.0');
    });

    it('should keep firmwareVersion undefined if not provided', () => {
      const payload = createFullTelemetryPayload({ firmwareVersion: undefined });
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      const registrationCall = mockDriverRegistry.registerDriver.mock.calls[0][0] as {
        telemetry: { firmwareVersion?: string };
      };
      expect(registrationCall.telemetry.firmwareVersion).toBeUndefined();
    });

    it('should extract testActive state if provided', () => {
      const payload = createFullTelemetryPayload({ testActive: true });
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      const registrationCall = mockDriverRegistry.registerDriver.mock.calls[0][0] as {
        testActive: boolean;
      };
      expect(registrationCall.testActive).toBe(true);
    });
  });

  describe('IPC serialization', () => {
    it('should serialize driver for IPC correctly', () => {
      const mockDriver: Driver = {
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
        stats: {
          telemetryEventsReceived: 1,
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
          currentFps: 120.0,
          minFps: 118.0,
          maxFps: 122.0,
        },
      };

      mockDriverRegistry.registerDriver.mockReturnValue(mockDriver);

      subscribeDriverTelemetry({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
      });

      subscribedCallback('rgfx/system/driver/telemetry', createFullTelemetryPayload());

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
