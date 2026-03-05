import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, mockDeep, type MockProxy, type DeepMockProxy } from 'vitest-mock-extended';
import { subscribeDriverTestState } from '../driver-test-state';
import type { DriverRegistry } from '@/driver-registry';
import type { BrowserWindow } from 'electron';
import { Driver } from '@/types';
import { createMockDriver, createMqttSubscriptionMock } from '@/__tests__/factories';

describe('subscribeDriverTestState', () => {
  let mqttMock: ReturnType<typeof createMqttSubscriptionMock>;
  let mockDriverRegistry: MockProxy<DriverRegistry>;
  let mockMainWindow: DeepMockProxy<BrowserWindow>;
  let mockDriver: Driver;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDriver = createMockDriver();

    mqttMock = createMqttSubscriptionMock();

    mockDriverRegistry = mock<DriverRegistry>();
    mockDriverRegistry.getDriver.mockReturnValue(mockDriver);

    mockMainWindow = mockDeep<BrowserWindow>();
    mockMainWindow.isDestroyed.mockReturnValue(false);
  });

  describe('subscription setup', () => {
    it('should subscribe to correct MQTT topic pattern', () => {
      subscribeDriverTestState({
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
      });

      expect(mqttMock.mockMqtt.subscribe).toHaveBeenCalledWith(
        'rgfx/driver/+/test/state',
        expect.any(Function),
      );
    });
  });

  describe('topic parsing', () => {
    beforeEach(() => {
      subscribeDriverTestState({
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
      });
    });

    it('should extract driver ID from valid topic', () => {
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/test/state', 'on');

      expect(mockDriverRegistry.getDriver).toHaveBeenCalledWith('rgfx-driver-0001');
    });

    it('should handle invalid topic format gracefully', () => {
      mqttMock.triggerMessage('rgfx/invalid/topic', 'on');

      expect(mockDriverRegistry.getDriver).not.toHaveBeenCalled();
    });

    it('should handle topic missing test/state suffix', () => {
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001', 'on');

      expect(mockDriverRegistry.getDriver).not.toHaveBeenCalled();
    });
  });

  describe('test state updates', () => {
    beforeEach(() => {
      subscribeDriverTestState({
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
      });
    });

    it('should set testActive to true when payload is "on"', () => {
      mockDriver.testActive = false;
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/test/state', 'on');

      expect(mockDriver.testActive).toBe(true);
    });

    it('should set testActive to false when payload is "off"', () => {
      mockDriver.testActive = true;
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/test/state', 'off');

      expect(mockDriver.testActive).toBe(false);
    });

    it('should set testActive to false for any non-"on" payload', () => {
      mockDriver.testActive = true;
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/test/state', 'invalid');

      expect(mockDriver.testActive).toBe(false);
    });

    it('should set testActive to false for empty payload', () => {
      mockDriver.testActive = true;
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/test/state', '');

      expect(mockDriver.testActive).toBe(false);
    });
  });

  describe('unknown driver handling', () => {
    beforeEach(() => {
      subscribeDriverTestState({
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
      });
    });

    it('should not throw for unknown driver', () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      expect(() => {
        mqttMock.triggerMessage('rgfx/driver/unknown-driver/test/state', 'on');
      }).not.toThrow();
    });

    it('should not send IPC message for unknown driver', () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);
      mqttMock.triggerMessage('rgfx/driver/unknown-driver/test/state', 'on');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });
  });

  describe('IPC communication', () => {
    beforeEach(() => {
      subscribeDriverTestState({
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
      });
    });

    it('should send driver:updated IPC message after state change', () => {
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/test/state', 'on');

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
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/test/state', 'on');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not send IPC message if window is null', () => {
      subscribeDriverTestState({
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => null,
      });

      const callback = mqttMock.mockMqtt.subscribe.mock.calls[1][1] as (
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
        mqtt: mqttMock.mockMqtt,
        driverRegistry: mockDriverRegistry,
        getMainWindow: () => mockMainWindow,
      });
    });

    it('should handle rapid on/off transitions', () => {
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/test/state', 'on');
      expect(mockDriver.testActive).toBe(true);

      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/test/state', 'off');
      expect(mockDriver.testActive).toBe(false);

      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/test/state', 'on');
      expect(mockDriver.testActive).toBe(true);
    });

    it('should send IPC message for each state change', () => {
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/test/state', 'on');
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/test/state', 'off');
      mqttMock.triggerMessage('rgfx/driver/rgfx-driver-0001/test/state', 'on');

      expect(mockMainWindow.webContents.send).toHaveBeenCalledTimes(3);
    });
  });
});
