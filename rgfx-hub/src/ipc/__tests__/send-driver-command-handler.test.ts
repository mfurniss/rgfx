/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { registerSendDriverCommandHandler } from '../send-driver-command-handler';
import type { DriverRegistry } from '@/driver-registry';
import type { MqttBroker } from '@/network';
import { Driver } from '@/types';
import { createMockDriver } from '@/__tests__/factories';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('registerSendDriverCommandHandler', () => {
  let mockDriverRegistry: MockProxy<DriverRegistry>;
  let mockMqtt: MockProxy<MqttBroker>;
  let mockDriver: Driver;
  let registeredHandler: (
    event: unknown,
    driverId: string,
    command: string,
    payload?: string,
  ) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockDriver = createMockDriver();

    mockDriverRegistry = mock<DriverRegistry>();
    mockDriverRegistry.getDriver.mockReturnValue(mockDriver);

    mockMqtt = mock<MqttBroker>();
    mockMqtt.publish.mockResolvedValue(undefined);

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (
        _channel: string,
        handler: (
          event: unknown,
          driverId: string,
          command: string,
          payload?: string,
        ) => Promise<void>,
      ) => {
        registeredHandler = handler;
      },
    );

    registerSendDriverCommandHandler({
      driverRegistry: mockDriverRegistry,
      mqtt: mockMqtt,
    });
  });

  describe('handler registration', () => {
    it('should register handler for driver:send-command channel', async () => {
      const { ipcMain } = await import('electron');
      expect(ipcMain.handle).toHaveBeenCalledWith('driver:send-command', expect.any(Function));
    });
  });

  describe('driver validation', () => {
    it('should throw error for non-existent driver', async () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      await expect(registeredHandler({}, 'unknown-driver', 'test')).rejects.toThrow(
        'No driver found with ID unknown-driver',
      );
    });

    it('should look up driver by provided ID', async () => {
      await registeredHandler({}, 'rgfx-driver-0001', 'test');

      expect(mockDriverRegistry.getDriver).toHaveBeenCalledWith('rgfx-driver-0001');
    });
  });

  describe('MQTT topic construction', () => {
    it('should construct correct topic for command', async () => {
      await registeredHandler({}, 'rgfx-driver-0001', 'restart');

      expect(mockMqtt.publish).toHaveBeenCalledWith('rgfx/driver/rgfx-driver-0001/restart', '');
    });

    it('should handle driver ID with special characters', async () => {
      await registeredHandler({}, 'rgfx-driver-0001', 'test');

      expect(mockMqtt.publish).toHaveBeenCalledWith('rgfx/driver/rgfx-driver-0001/test', '');
    });

    it('should handle various command names', async () => {
      await registeredHandler({}, 'rgfx-driver-0001', 'led-test');
      expect(mockMqtt.publish).toHaveBeenCalledWith('rgfx/driver/rgfx-driver-0001/led-test', '');

      mockMqtt.publish.mockClear();

      await registeredHandler({}, 'rgfx-driver-0001', 'config/reload');
      expect(mockMqtt.publish).toHaveBeenCalledWith('rgfx/driver/rgfx-driver-0001/config/reload', '');
    });
  });

  describe('payload handling', () => {
    it('should publish command without payload', async () => {
      await registeredHandler({}, 'rgfx-driver-0001', 'restart');

      expect(mockMqtt.publish).toHaveBeenCalledWith('rgfx/driver/rgfx-driver-0001/restart', '');
    });

    it('should publish command with payload', async () => {
      const payload = JSON.stringify({ brightness: 100 });
      await registeredHandler({}, 'rgfx-driver-0001', 'config', payload);

      expect(mockMqtt.publish).toHaveBeenCalledWith('rgfx/driver/rgfx-driver-0001/config', payload);
    });

    it('should handle empty string payload', async () => {
      await registeredHandler({}, 'rgfx-driver-0001', 'test', '');

      expect(mockMqtt.publish).toHaveBeenCalledWith('rgfx/driver/rgfx-driver-0001/test', '');
    });

    it('should handle undefined payload explicitly', async () => {
      await registeredHandler({}, 'rgfx-driver-0001', 'test', undefined);

      expect(mockMqtt.publish).toHaveBeenCalledWith('rgfx/driver/rgfx-driver-0001/test', '');
    });

    it('should preserve JSON payload structure', async () => {
      const complexPayload = JSON.stringify({
        ledDevices: [{ type: 'strip', count: 60 }],
        settings: { brightness: 255, colorOrder: 'GRB' },
      });
      await registeredHandler({}, 'rgfx-driver-0001', 'config', complexPayload);

      expect(mockMqtt.publish).toHaveBeenCalledWith(
        'rgfx/driver/rgfx-driver-0001/config',
        complexPayload,
      );
    });
  });

  describe('error handling', () => {
    it('should propagate MQTT publish errors', async () => {
      const mqttError = new Error('MQTT connection failed');
      mockMqtt.publish.mockRejectedValue(mqttError);

      await expect(registeredHandler({}, 'rgfx-driver-0001', 'test')).rejects.toThrow(
        'MQTT connection failed',
      );
    });

    it('should not publish if driver lookup fails', async () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      try {
        await registeredHandler({}, 'unknown-driver', 'test');
      } catch {
        // Expected error
      }

      expect(mockMqtt.publish).not.toHaveBeenCalled();
    });
  });

  describe('command execution flow', () => {
    it('should complete successfully for valid driver and command', async () => {
      await expect(registeredHandler({}, 'rgfx-driver-0001', 'restart')).resolves.toBeUndefined();
    });

    it('should call driver lookup before MQTT publish', async () => {
      const callOrder: string[] = [];
      mockDriverRegistry.getDriver.mockImplementation(() => {
        callOrder.push('getDriver');
        return mockDriver;
      });
      mockMqtt.publish.mockImplementation(() => {
        callOrder.push('publish');
        return Promise.resolve();
      });

      await registeredHandler({}, 'rgfx-driver-0001', 'test');

      expect(callOrder).toEqual(['getDriver', 'publish']);
    });
  });
});
