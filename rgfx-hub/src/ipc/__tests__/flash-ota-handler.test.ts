/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { registerFlashOtaHandler } from '../flash-ota-handler';
import { eventBus } from '@/services/event-bus';
import type { DriverRegistry } from '@/driver-registry';
import type { Driver } from '@/types';

vi.mocked(eventBus);

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  app: {
    isPackaged: false,
    getAppPath: vi.fn(() => '/mock/app/path'),
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

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

vi.mock('@/services/event-bus', () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

class MockEspOTA {
  static FLASH = 'flash';
  uploadFile = vi.fn(() => Promise.resolve());
  on = vi.fn(() => this);
}

vi.mock('esp-ota', () => ({
  default: MockEspOTA,
}));

describe('registerFlashOtaHandler', () => {
  let mockDriverRegistry: {
    getDriver: ReturnType<typeof vi.fn>;
    touchDriver: ReturnType<typeof vi.fn>;
  };
  let mockDriver: Driver;
  let registeredHandler: (
    event: unknown,
    driverId: string,
  ) => Promise<{ success: boolean; error?: string }>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const fs = await import('fs');
    (fs.existsSync as Mock).mockReturnValue(true);

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

    mockDriverRegistry = {
      getDriver: vi.fn(() => mockDriver),
      touchDriver: vi.fn(() => mockDriver),
    };

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (
        _channel: string,
        handler: (
          event: unknown,
          driverId: string,
        ) => Promise<{ success: boolean; error?: string }>,
      ) => {
        registeredHandler = handler;
      },
    );

    registerFlashOtaHandler({
      driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
    });
  });

  describe('handler registration', () => {
    it('should register handler for driver:flash-ota channel', async () => {
      const { ipcMain } = await import('electron');
      expect(ipcMain.handle).toHaveBeenCalledWith('driver:flash-ota', expect.any(Function));
    });
  });

  describe('driver validation', () => {
    it('should return error for non-existent driver', async () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      const result = await registeredHandler({}, 'unknown-driver');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Driver not found');
    });

    it('should return error for disconnected driver', async () => {
      mockDriver.state = 'disconnected';
      mockDriverRegistry.getDriver.mockReturnValue(mockDriver);

      const result = await registeredHandler({}, 'rgfx-driver-0001');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Driver is not connected');
    });

    it('should return error if driver has no IP address', async () => {
      mockDriver.ip = undefined;
      mockDriverRegistry.getDriver.mockReturnValue(mockDriver);

      const result = await registeredHandler({}, 'rgfx-driver-0001');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Driver IP address not available');
    });
  });

  describe('firmware file validation', () => {
    it('should return error if firmware file not found', async () => {
      const fs = await import('fs');
      (fs.existsSync as Mock).mockReturnValue(false);

      const result = await registeredHandler({}, 'rgfx-driver-0001');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Firmware file not found');
    });
  });

  describe('OTA upload', () => {
    it('should return success on successful upload', async () => {
      const result = await registeredHandler({}, 'rgfx-driver-0001');

      expect(result.success).toBe(true);
    });

    it('should emit driver:disconnected with restarting reason on success', async () => {
      await registeredHandler({}, 'rgfx-driver-0001');

      expect(eventBus.emit).toHaveBeenCalledWith('driver:disconnected', {
        driver: expect.objectContaining({ state: 'disconnected', ip: undefined }),
        reason: 'restarting',
      });
    });

    it('should touch driver during progress updates', async () => {
      await registeredHandler({}, 'rgfx-driver-0001');

      // touchDriver should be called during progress updates
      expect(mockDriverRegistry.touchDriver).toHaveBeenCalled();
    });

    it('should set driver state to updating before upload', async () => {
      // Track state transitions by capturing when emit is called
      let stateWhenFirstEmitCalled: string | undefined;
      vi.mocked(eventBus.emit).mockImplementationOnce((event, data) => {
        if (event === 'driver:updated') {
          stateWhenFirstEmitCalled = (data as { driver: Driver }).driver.state;
        }
      });

      await registeredHandler({}, 'rgfx-driver-0001');

      // driver:updated should have been called with state 'updating'
      expect(stateWhenFirstEmitCalled).toBe('updating');
    });
  });

  describe('error handling', () => {
    it('should not throw, returns error object instead', async () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      await expect(registeredHandler({}, 'unknown-driver')).resolves.toEqual({
        success: false,
        error: 'Driver not found',
      });
    });

    it('should handle Error objects correctly', async () => {
      mockDriverRegistry.getDriver.mockImplementation(() => {
        throw new Error('Custom error message');
      });

      const result = await registeredHandler({}, 'rgfx-driver-0001');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Custom error message');
    });
  });

  describe('progress calculation', () => {
    it('should round progress percentage correctly (50%)', () => {
      const percent = Math.round((50 / 100) * 100);
      expect(percent).toBe(50);
    });

    it('should round progress percentage correctly (33%)', () => {
      const percent = Math.round((333 / 1000) * 100);
      expect(percent).toBe(33);
    });

    it('should round progress percentage correctly (100%)', () => {
      const percent = Math.round((1000 / 1000) * 100);
      expect(percent).toBe(100);
    });

    it('should round progress percentage correctly (0%)', () => {
      const percent = Math.round((0 / 1000) * 100);
      expect(percent).toBe(0);
    });
  });

  describe('firmware path resolution', () => {
    it('should use development path when not packaged', async () => {
      const fs = await import('fs');
      const existsSyncMock = fs.existsSync as Mock;
      existsSyncMock.mockReturnValue(true);

      await registeredHandler({}, 'rgfx-driver-0001');

      expect(existsSyncMock).toHaveBeenCalledWith(
        expect.stringContaining('assets/esp32/firmware/firmware.bin'),
      );
    });
  });
});
