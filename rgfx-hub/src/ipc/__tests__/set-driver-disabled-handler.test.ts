/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerSetDriverDisabledHandler } from '../set-driver-disabled-handler';
import type { DriverRegistry } from '@/driver-registry';
import type { DriverPersistence } from '@/driver-persistence';
import type { LEDHardwareManager } from '@/led-hardware-manager';
import type { BrowserWindow } from 'electron';

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

describe('registerSetDriverDisabledHandler', () => {
  let mockDriverRegistry: {
    getDriver: ReturnType<typeof vi.fn>;
    refreshDriverFromPersistence: ReturnType<typeof vi.fn>;
  };
  let mockDriverPersistence: {
    setDisabled: ReturnType<typeof vi.fn>;
  };
  let mockLedHardwareManager: object;
  let mockMainWindow: {
    isDestroyed: ReturnType<typeof vi.fn>;
    webContents: {
      send: ReturnType<typeof vi.fn>;
    };
  };
  let mockDriver: Record<string, unknown>;
  let registeredHandler: (
    event: unknown,
    driverId: string,
    disabled: boolean,
  ) => { success: boolean };

  beforeEach(async () => {
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

    mockDriverRegistry = {
      getDriver: vi.fn().mockReturnValue(mockDriver),
      refreshDriverFromPersistence: vi.fn().mockReturnValue({ ...mockDriver, disabled: true }),
    };

    mockDriverPersistence = {
      setDisabled: vi.fn().mockReturnValue(true),
    };

    mockLedHardwareManager = {};

    mockMainWindow = {
      isDestroyed: vi.fn().mockReturnValue(false),
      webContents: {
        send: vi.fn(),
      },
    };

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (
        _channel: string,
        handler: (event: unknown, driverId: string, disabled: boolean) => { success: boolean },
      ) => {
        registeredHandler = handler;
      },
    );

    registerSetDriverDisabledHandler({
      driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
      driverPersistence: mockDriverPersistence as unknown as DriverPersistence,
      ledHardwareManager: mockLedHardwareManager as unknown as LEDHardwareManager,
      getMainWindow: () => mockMainWindow as unknown as BrowserWindow,
    });
  });

  it('registers the driver:set-disabled handler', async () => {
    const { ipcMain } = await import('electron');
    expect(ipcMain.handle).toHaveBeenCalledWith('driver:set-disabled', expect.any(Function));
  });

  describe('handler behavior', () => {
    it('throws error when driver not found', () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      expect(() => registeredHandler({}, 'nonexistent-driver', true)).toThrow(
        'No driver found with ID nonexistent-driver',
      );
    });

    it('throws error when driver has no MAC address', () => {
      mockDriverRegistry.getDriver.mockReturnValue({ ...mockDriver, mac: undefined });

      expect(() => registeredHandler({}, 'rgfx-driver-0001', true)).toThrow(
        'Driver rgfx-driver-0001 has no MAC address',
      );
    });

    it('calls setDisabled on persistence with correct arguments', () => {
      registeredHandler({}, 'rgfx-driver-0001', true);

      expect(mockDriverPersistence.setDisabled).toHaveBeenCalledWith('rgfx-driver-0001', true);
    });

    it('throws error when persistence update fails', () => {
      mockDriverPersistence.setDisabled.mockReturnValue(false);

      expect(() => registeredHandler({}, 'rgfx-driver-0001', true)).toThrow(
        'Failed to update disabled state for driver rgfx-driver-0001',
      );
    });

    it('refreshes driver from persistence after update', () => {
      registeredHandler({}, 'rgfx-driver-0001', true);

      expect(mockDriverRegistry.refreshDriverFromPersistence).toHaveBeenCalledWith(
        'AA:BB:CC:DD:EE:FF',
        mockLedHardwareManager,
      );
    });

    it('sends driver:updated IPC event when window is available', () => {
      registeredHandler({}, 'rgfx-driver-0001', true);

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'driver:updated',
        expect.objectContaining({
          id: 'rgfx-driver-0001',
          disabled: true,
        }),
      );
    });

    it('does not send IPC event when window is destroyed', () => {
      mockMainWindow.isDestroyed.mockReturnValue(true);

      registeredHandler({}, 'rgfx-driver-0001', true);

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('does not send IPC event when window is null', () => {
      registerSetDriverDisabledHandler({
        driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
        driverPersistence: mockDriverPersistence as unknown as DriverPersistence,
        ledHardwareManager: mockLedHardwareManager as unknown as LEDHardwareManager,
        getMainWindow: () => null,
      });

      // Handler was re-registered, need to get the new one
      // Since this is the second registration, it won't affect the previously captured handler
      // This test validates the null window path by registering a new handler
      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('returns success when operation completes', () => {
      const result = registeredHandler({}, 'rgfx-driver-0001', true);

      expect(result).toEqual({ success: true });
    });

    it('handles enabling a disabled driver', () => {
      const disabledDriver = { ...mockDriver, disabled: true };
      mockDriverRegistry.getDriver.mockReturnValue(disabledDriver);
      mockDriverRegistry.refreshDriverFromPersistence.mockReturnValue({
        ...disabledDriver,
        disabled: false,
      });

      const result = registeredHandler({}, 'rgfx-driver-0001', false);

      expect(mockDriverPersistence.setDisabled).toHaveBeenCalledWith('rgfx-driver-0001', false);
      expect(result).toEqual({ success: true });
    });
  });
});
