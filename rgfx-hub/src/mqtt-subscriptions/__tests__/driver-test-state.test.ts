/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { subscribeDriverTestState } from '../driver-test-state';
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

describe('subscribeDriverTestState', () => {
  let mockMqtt: {
    subscribe: ReturnType<typeof vi.fn>;
  };
  let mockDriverRegistry: {
    getDriver: ReturnType<typeof vi.fn>;
  };
  let mockMainWindow: {
    isDestroyed: ReturnType<typeof vi.fn>;
    webContents: {
      send: ReturnType<typeof vi.fn>;
    };
  };
  let subscribedCallback: (topic: string, payload: string) => void;
  let mockDriver: Driver;

  beforeEach(() => {
    vi.clearAllMocks();

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

    mockMqtt = {
      subscribe: vi.fn((topic: string, callback: (topic: string, payload: string) => void) => {
        subscribedCallback = callback;
      }),
    };

    mockDriverRegistry = {
      getDriver: vi.fn(() => mockDriver),
    };

    mockMainWindow = {
      isDestroyed: vi.fn(() => false),
      webContents: {
        send: vi.fn(),
      },
    };
  });

  describe('subscription setup', () => {
    it('should subscribe to correct MQTT topic pattern', () => {
      subscribeDriverTestState({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
      });

      expect(mockMqtt.subscribe).toHaveBeenCalledWith(
        'rgfx/driver/+/test/state',
        expect.any(Function),
      );
    });
  });

  describe('topic parsing', () => {
    beforeEach(() => {
      subscribeDriverTestState({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
      });
    });

    it('should extract driver ID from valid topic', () => {
      subscribedCallback('rgfx/driver/rgfx-driver-0001/test/state', 'on');

      expect(mockDriverRegistry.getDriver).toHaveBeenCalledWith('rgfx-driver-0001');
    });

    it('should extract driver ID with MAC address format', () => {
      subscribedCallback('rgfx/driver/AA:BB:CC:DD:EE:FF/test/state', 'on');

      expect(mockDriverRegistry.getDriver).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    });

    it('should handle invalid topic format gracefully', () => {
      subscribedCallback('rgfx/invalid/topic', 'on');

      expect(mockDriverRegistry.getDriver).not.toHaveBeenCalled();
    });

    it('should handle topic missing test/state suffix', () => {
      subscribedCallback('rgfx/driver/rgfx-driver-0001', 'on');

      expect(mockDriverRegistry.getDriver).not.toHaveBeenCalled();
    });
  });

  describe('test state updates', () => {
    beforeEach(() => {
      subscribeDriverTestState({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
      });
    });

    it('should set testActive to true when payload is "on"', () => {
      mockDriver.testActive = false;
      subscribedCallback('rgfx/driver/rgfx-driver-0001/test/state', 'on');

      expect(mockDriver.testActive).toBe(true);
    });

    it('should set testActive to false when payload is "off"', () => {
      mockDriver.testActive = true;
      subscribedCallback('rgfx/driver/rgfx-driver-0001/test/state', 'off');

      expect(mockDriver.testActive).toBe(false);
    });

    it('should set testActive to false for any non-"on" payload', () => {
      mockDriver.testActive = true;
      subscribedCallback('rgfx/driver/rgfx-driver-0001/test/state', 'invalid');

      expect(mockDriver.testActive).toBe(false);
    });

    it('should set testActive to false for empty payload', () => {
      mockDriver.testActive = true;
      subscribedCallback('rgfx/driver/rgfx-driver-0001/test/state', '');

      expect(mockDriver.testActive).toBe(false);
    });
  });

  describe('unknown driver handling', () => {
    beforeEach(() => {
      subscribeDriverTestState({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
      });
    });

    it('should not throw for unknown driver', () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      expect(() => {
        subscribedCallback('rgfx/driver/unknown-driver/test/state', 'on');
      }).not.toThrow();
    });

    it('should not send IPC message for unknown driver', () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);
      subscribedCallback('rgfx/driver/unknown-driver/test/state', 'on');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('IPC communication', () => {
    beforeEach(() => {
      subscribeDriverTestState({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
      });
    });

    it('should send driver:updated IPC message after state change', () => {
      subscribedCallback('rgfx/driver/rgfx-driver-0001/test/state', 'on');

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'driver:updated',
        expect.objectContaining({
          id: 'rgfx-driver-0001',
          testActive: true,
        }),
      );
    });

    it('should not send IPC message if window is destroyed', () => {
      mockMainWindow.isDestroyed.mockReturnValue(true);
      subscribedCallback('rgfx/driver/rgfx-driver-0001/test/state', 'on');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not send IPC message if window is null', () => {
      subscribeDriverTestState({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => null,
      });

      const callback = mockMqtt.subscribe.mock.calls[1][1] as (
        topic: string,
        payload: string,
      ) => void;
      callback('rgfx/driver/rgfx-driver-0001/test/state', 'on');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('state transitions', () => {
    beforeEach(() => {
      subscribeDriverTestState({
        mqtt: mockMqtt as unknown as MqttBroker,
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
      });
    });

    it('should handle rapid on/off transitions', () => {
      subscribedCallback('rgfx/driver/rgfx-driver-0001/test/state', 'on');
      expect(mockDriver.testActive).toBe(true);

      subscribedCallback('rgfx/driver/rgfx-driver-0001/test/state', 'off');
      expect(mockDriver.testActive).toBe(false);

      subscribedCallback('rgfx/driver/rgfx-driver-0001/test/state', 'on');
      expect(mockDriver.testActive).toBe(true);
    });

    it('should send IPC message for each state change', () => {
      subscribedCallback('rgfx/driver/rgfx-driver-0001/test/state', 'on');
      subscribedCallback('rgfx/driver/rgfx-driver-0001/test/state', 'off');
      subscribedCallback('rgfx/driver/rgfx-driver-0001/test/state', 'on');

      expect(mockMainWindow.webContents.send).toHaveBeenCalledTimes(3);
    });
  });
});
