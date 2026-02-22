import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, mockDeep, type MockProxy, type DeepMockProxy } from 'vitest-mock-extended';
import { subscribeDriverTestState } from '../driver-test-state';
import type { MqttBroker } from '@/network';
import type { DriverRegistry } from '@/driver-registry';
import type { BrowserWindow } from 'electron';
import { Driver } from '@/types';
import { createMockDriver } from '@/__tests__/factories';

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('subscribeDriverTestState', () => {
  let mockMqtt: MockProxy<MqttBroker>;
  let mockDriverRegistry: MockProxy<DriverRegistry>;
  let mockMainWindow: DeepMockProxy<BrowserWindow>;
  let subscribedCallback: (topic: string, payload: string) => void;
  let mockDriver: Driver;

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

    mockMainWindow = mockDeep<BrowserWindow>();
    mockMainWindow.isDestroyed.mockReturnValue(false);
  });

  describe('subscription setup', () => {
    it('should subscribe to correct MQTT topic pattern', () => {
      subscribeDriverTestState({
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
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
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
      });
    });

    it('should extract driver ID from valid topic', () => {
      subscribedCallback('rgfx/driver/rgfx-driver-0001/test/state', 'on');

      expect(mockDriverRegistry.getDriver).toHaveBeenCalledWith('rgfx-driver-0001');
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
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
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
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
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
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
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
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
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
        mqtt: mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
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
