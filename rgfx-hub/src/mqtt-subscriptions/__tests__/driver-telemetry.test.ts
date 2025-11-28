/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { subscribeDriverTelemetry } from '../driver-telemetry';
import type { MqttBroker } from '../../mqtt';
import type { DriverRegistry } from '../../driver-registry';
import type { BrowserWindow } from 'electron';
import type { Driver } from '../../types';

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
        connected: true,
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
      ...overrides,
    });

  const createMinimalTelemetryPayload = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({
      ip: '192.168.1.100',
      mac: 'AA:BB:CC:DD:EE:FF',
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

  describe('minimal telemetry handling (backward compatibility)', () => {
    beforeEach(() => {
      subscribeDriverTelemetry({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
      });
    });

    it('should register driver with minimal telemetry (only ip and mac)', () => {
      const payload = createMinimalTelemetryPayload();
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      expect(mockDriverRegistry.registerDriver).toHaveBeenCalledWith(
        expect.objectContaining({
          ip: '192.168.1.100',
          mac: 'AA:BB:CC:DD:EE:FF',
          hostname: 'unknown',
          telemetry: expect.objectContaining({
            chipModel: 'ESP32',
            cpuFreqMHz: 240,
          }),
        }),
      );
    });

    it('should use placeholder values for missing telemetry fields', () => {
      const payload = createMinimalTelemetryPayload();
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      const registrationCall = mockDriverRegistry.registerDriver.mock.calls[0][0] as {
        telemetry: { chipModel: string; sdkVersion: string };
        hostname: string;
        ssid: string;
        rssi: number;
      };
      expect(registrationCall.hostname).toBe('unknown');
      expect(registrationCall.ssid).toBe('unknown');
      expect(registrationCall.rssi).toBe(-100);
      expect(registrationCall.telemetry.chipModel).toBe('ESP32');
      expect(registrationCall.telemetry.sdkVersion).toBe('unknown');
    });

    it('should preserve provided optional fields in minimal payload', () => {
      const payload = createMinimalTelemetryPayload({
        hostname: 'custom-hostname',
        cpuFreqMHz: 160,
      });
      subscribedCallback('rgfx/system/driver/telemetry', payload);

      const registrationCall = mockDriverRegistry.registerDriver.mock.calls[0][0] as {
        telemetry: { cpuFreqMHz: number };
        hostname: string;
      };
      expect(registrationCall.hostname).toBe('custom-hostname');
      expect(registrationCall.telemetry.cpuFreqMHz).toBe(160);
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

    it('should keep firmwareVersion undefined in minimal payload if not provided', () => {
      const payload = createMinimalTelemetryPayload();
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
          connected: true,
        }),
      );
    });
  });
});
