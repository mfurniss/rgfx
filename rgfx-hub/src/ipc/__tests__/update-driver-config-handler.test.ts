/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerUpdateDriverConfigHandler } from '../update-driver-config-handler';
import type { DriverRegistry } from '@/driver-registry';
import type { Driver } from '@/types';

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

describe('registerUpdateDriverConfigHandler', () => {
  let mockDriverRegistry: {
    getDriver: ReturnType<typeof vi.fn>;
  };
  let mockUploadConfigToDriver: ReturnType<typeof vi.fn>;
  let mockDriver: Driver;
  let registeredHandler: (event: unknown, driverId: string) => Promise<void>;

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
      },
    };

    mockDriverRegistry = {
      getDriver: vi.fn(() => mockDriver),
    };

    mockUploadConfigToDriver = vi.fn(() => Promise.resolve());

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (_channel: string, handler: (event: unknown, driverId: string) => Promise<void>) => {
        registeredHandler = handler;
      },
    );

    registerUpdateDriverConfigHandler({
      driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
      uploadConfigToDriver: mockUploadConfigToDriver,
    });
  });

  describe('handler registration', () => {
    it('should register handler for driver:update-config channel', async () => {
      const { ipcMain } = await import('electron');
      expect(ipcMain.handle).toHaveBeenCalledWith('driver:update-config', expect.any(Function));
    });
  });

  describe('driver validation', () => {
    it('should throw error for non-existent driver', async () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      await expect(registeredHandler({}, 'unknown-driver')).rejects.toThrow(
        'No driver found with ID unknown-driver',
      );
    });

    it('should look up driver by provided ID', async () => {
      await registeredHandler({}, 'rgfx-driver-0001');

      expect(mockDriverRegistry.getDriver).toHaveBeenCalledWith('rgfx-driver-0001');
    });
  });

  describe('MAC address validation', () => {
    it('should throw error if driver has no MAC address', async () => {
      mockDriver.mac = undefined;
      mockDriverRegistry.getDriver.mockReturnValue(mockDriver);

      await expect(registeredHandler({}, 'rgfx-driver-0001')).rejects.toThrow(
        'Driver rgfx-driver-0001 has no MAC address',
      );
    });

    it('should throw error if driver MAC is empty string', async () => {
      mockDriver.mac = '';
      mockDriverRegistry.getDriver.mockReturnValue(mockDriver);

      await expect(registeredHandler({}, 'rgfx-driver-0001')).rejects.toThrow(
        'Driver rgfx-driver-0001 has no MAC address',
      );
    });
  });

  describe('config upload', () => {
    it('should call uploadConfigToDriver with driver MAC', async () => {
      await registeredHandler({}, 'rgfx-driver-0001');

      expect(mockUploadConfigToDriver).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    });

    it('should call uploadConfigToDriver exactly once', async () => {
      await registeredHandler({}, 'rgfx-driver-0001');

      expect(mockUploadConfigToDriver).toHaveBeenCalledTimes(1);
    });

    it('should wait for upload to complete', async () => {
      let uploadCompleted = false;
      mockUploadConfigToDriver.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        uploadCompleted = true;
      });

      await registeredHandler({}, 'rgfx-driver-0001');

      expect(uploadCompleted).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should propagate upload errors', async () => {
      const uploadError = new Error('Config upload failed');
      mockUploadConfigToDriver.mockRejectedValue(uploadError);

      await expect(registeredHandler({}, 'rgfx-driver-0001')).rejects.toThrow(
        'Config upload failed',
      );
    });

    it('should not call upload if driver lookup fails', async () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      try {
        await registeredHandler({}, 'unknown-driver');
      } catch {
        // Expected error
      }

      expect(mockUploadConfigToDriver).not.toHaveBeenCalled();
    });

    it('should not call upload if MAC validation fails', async () => {
      mockDriver.mac = undefined;
      mockDriverRegistry.getDriver.mockReturnValue(mockDriver);

      try {
        await registeredHandler({}, 'rgfx-driver-0001');
      } catch {
        // Expected error
      }

      expect(mockUploadConfigToDriver).not.toHaveBeenCalled();
    });
  });

  describe('execution flow', () => {
    it('should validate driver before calling upload', async () => {
      const callOrder: string[] = [];
      mockDriverRegistry.getDriver.mockImplementation(() => {
        callOrder.push('getDriver');
        return mockDriver;
      });
      mockUploadConfigToDriver.mockImplementation(() => {
        callOrder.push('uploadConfig');
        return Promise.resolve();
      });

      await registeredHandler({}, 'rgfx-driver-0001');

      expect(callOrder).toEqual(['getDriver', 'uploadConfig']);
    });

    it('should complete successfully for valid driver', async () => {
      await expect(registeredHandler({}, 'rgfx-driver-0001')).resolves.toBeUndefined();
    });
  });
});
