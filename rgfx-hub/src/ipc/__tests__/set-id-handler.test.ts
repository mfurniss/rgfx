/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerSetIdHandler } from '../set-id-handler';
import type { DriverRegistry } from '../../driver-registry';
import type { MqttBroker } from '../../mqtt';
import type { Driver } from '../../types';

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

describe('registerSetIdHandler', () => {
  let mockDriverRegistry: {
    getDriver: ReturnType<typeof vi.fn>;
  };
  let mockMqtt: {
    publish: ReturnType<typeof vi.fn>;
  };
  let mockDriver: Driver;
  let registeredHandler: (
    event: unknown,
    driverId: string,
    newId: string,
  ) => Promise<{ success: boolean; error?: string }>;

  beforeEach(async () => {
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
      getDriver: vi.fn(() => mockDriver),
    };

    mockMqtt = {
      publish: vi.fn(() => Promise.resolve()),
    };

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (
        _channel: string,
        handler: (
          event: unknown,
          driverId: string,
          newId: string,
        ) => Promise<{ success: boolean; error?: string }>,
      ) => {
        registeredHandler = handler;
      },
    );

    registerSetIdHandler({
      driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
      mqtt: mockMqtt as unknown as MqttBroker,
    });
  });

  describe('handler registration', () => {
    it('should register handler for driver:set-id channel', async () => {
      const { ipcMain } = await import('electron');
      expect(ipcMain.handle).toHaveBeenCalledWith('driver:set-id', expect.any(Function));
    });
  });

  describe('ID validation', () => {
    it('should reject empty ID', async () => {
      const result = await registeredHandler({}, 'rgfx-driver-0001', '');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockMqtt.publish).not.toHaveBeenCalled();
    });

    it('should reject ID with spaces', async () => {
      const result = await registeredHandler({}, 'rgfx-driver-0001', 'driver with spaces');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockMqtt.publish).not.toHaveBeenCalled();
    });

    it('should reject ID that is too long', async () => {
      const longId = 'a'.repeat(33);
      const result = await registeredHandler({}, 'rgfx-driver-0001', longId);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(mockMqtt.publish).not.toHaveBeenCalled();
    });

    it('should accept valid ID with hyphens', async () => {
      const result = await registeredHandler({}, 'rgfx-driver-0001', 'rgfx-driver-0002');

      expect(result.success).toBe(true);
      expect(mockMqtt.publish).toHaveBeenCalled();
    });

    it('should accept valid alphanumeric ID', async () => {
      const result = await registeredHandler({}, 'rgfx-driver-0001', 'mydriver123');

      expect(result.success).toBe(true);
      expect(mockMqtt.publish).toHaveBeenCalled();
    });
  });

  describe('driver validation', () => {
    it('should return error for non-existent driver', async () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      const result = await registeredHandler({}, 'unknown-driver', 'new-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Driver not found');
    });

    it('should look up driver by provided ID', async () => {
      await registeredHandler({}, 'rgfx-driver-0001', 'new-id');

      expect(mockDriverRegistry.getDriver).toHaveBeenCalledWith('rgfx-driver-0001');
    });
  });

  describe('MQTT publishing', () => {
    it('should publish to correct topic', async () => {
      await registeredHandler({}, 'rgfx-driver-0001', 'new-id');

      expect(mockMqtt.publish).toHaveBeenCalledWith(
        'rgfx/driver/rgfx-driver-0001/set-id',
        expect.any(String),
      );
    });

    it('should publish JSON payload with new ID', async () => {
      await registeredHandler({}, 'rgfx-driver-0001', 'new-driver-id');

      const publishCall = mockMqtt.publish.mock.calls[0];
      const payload = JSON.parse(publishCall[1] as string) as { id: string };

      expect(payload.id).toBe('new-driver-id');
    });
  });

  describe('error handling', () => {
    it('should return error when MQTT publish fails', async () => {
      mockMqtt.publish.mockRejectedValue(new Error('MQTT error'));

      const result = await registeredHandler({}, 'rgfx-driver-0001', 'new-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('MQTT error');
    });

    it('should not throw on error (returns error object instead)', async () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      await expect(registeredHandler({}, 'unknown-driver', 'new-id')).resolves.toEqual({
        success: false,
        error: 'Driver not found',
      });
    });
  });

  describe('success response', () => {
    it('should return success:true on successful ID change', async () => {
      const result = await registeredHandler({}, 'rgfx-driver-0001', 'new-id');

      expect(result).toEqual({ success: true });
    });

    it('should complete validation before publish', async () => {
      const callOrder: string[] = [];
      mockDriverRegistry.getDriver.mockImplementation(() => {
        callOrder.push('getDriver');
        return mockDriver;
      });
      mockMqtt.publish.mockImplementation(() => {
        callOrder.push('publish');
        return Promise.resolve();
      });

      await registeredHandler({}, 'rgfx-driver-0001', 'new-id');

      expect(callOrder).toEqual(['getDriver', 'publish']);
    });
  });
});
