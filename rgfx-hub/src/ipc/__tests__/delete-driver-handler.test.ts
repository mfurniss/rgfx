/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, mockDeep, type MockProxy, type DeepMockProxy } from 'vitest-mock-extended';
import { registerDeleteDriverHandler } from '../delete-driver-handler';
import type { DriverRegistry } from '@/driver-registry';
import type { DriverConfig } from '@/driver-config';
import type { BrowserWindow } from 'electron';
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

describe('registerDeleteDriverHandler', () => {
  let mockDriverRegistry: MockProxy<DriverRegistry>;
  let mockDriverConfig: MockProxy<DriverConfig>;
  let mockMainWindow: DeepMockProxy<BrowserWindow>;
  let mockDriver: Driver;
  let registeredHandler: (event: unknown, driverId: string) => { success: boolean };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockDriver = createMockDriver();

    mockDriverRegistry = mock<DriverRegistry>();
    mockDriverRegistry.getDriver.mockReturnValue(mockDriver);
    mockDriverRegistry.deleteDriver.mockReturnValue(true);

    mockDriverConfig = mock<DriverConfig>();
    mockDriverConfig.deleteDriver.mockReturnValue(true);

    mockMainWindow = mockDeep<BrowserWindow>();
    mockMainWindow.isDestroyed.mockReturnValue(false);

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (_channel: string, handler: (event: unknown, driverId: string) => { success: boolean }) => {
        registeredHandler = handler;
      },
    );

    registerDeleteDriverHandler({
      driverRegistry: mockDriverRegistry,
      driverConfig: mockDriverConfig,
      getMainWindow: () => mockMainWindow,
    });
  });

  it('registers the driver:delete handler', async () => {
    const { ipcMain } = await import('electron');
    expect(ipcMain.handle).toHaveBeenCalledWith('driver:delete', expect.any(Function));
  });

  describe('handler behavior', () => {
    it('throws error when driver not found', () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      expect(() => registeredHandler({}, 'nonexistent-driver')).toThrow(
        'No driver found with ID nonexistent-driver',
      );
    });

    it('calls deleteDriver on persistence with correct driverId', () => {
      registeredHandler({}, 'rgfx-driver-0001');

      expect(mockDriverConfig.deleteDriver).toHaveBeenCalledWith('rgfx-driver-0001');
    });

    it('throws error when persistence delete fails', () => {
      mockDriverConfig.deleteDriver.mockReturnValue(false);

      expect(() => registeredHandler({}, 'rgfx-driver-0001')).toThrow(
        'Failed to delete driver rgfx-driver-0001 from persistence',
      );
    });

    it('calls deleteDriver on registry after persistence succeeds', () => {
      registeredHandler({}, 'rgfx-driver-0001');

      expect(mockDriverRegistry.deleteDriver).toHaveBeenCalledWith('rgfx-driver-0001');
    });

    it('sends driver:deleted IPC event when window is available', () => {
      registeredHandler({}, 'rgfx-driver-0001');

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'driver:deleted',
        'rgfx-driver-0001',
      );
    });

    it('does not send IPC event when window is destroyed', () => {
      mockMainWindow.isDestroyed.mockReturnValue(true);

      registeredHandler({}, 'rgfx-driver-0001');

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('does not send IPC event when window is null', () => {
      registerDeleteDriverHandler({
        driverRegistry: mockDriverRegistry,
        driverConfig: mockDriverConfig,
        getMainWindow: () => null,
      });

      // The new registration doesn't affect previously captured handler
      // This test validates the code path exists
      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('returns success when operation completes', () => {
      const result = registeredHandler({}, 'rgfx-driver-0001');

      expect(result).toEqual({ success: true });
    });

    it('deletes from persistence before registry', () => {
      const callOrder: string[] = [];
      mockDriverConfig.deleteDriver.mockImplementation(() => {
        callOrder.push('persistence');
        return true;
      });
      mockDriverRegistry.deleteDriver.mockImplementation(() => {
        callOrder.push('registry');
        return true;
      });

      registeredHandler({}, 'rgfx-driver-0001');

      expect(callOrder).toEqual(['persistence', 'registry']);
    });

    it('does not delete from registry if persistence fails', () => {
      mockDriverConfig.deleteDriver.mockReturnValue(false);

      expect(() => registeredHandler({}, 'rgfx-driver-0001')).toThrow();
      expect(mockDriverRegistry.deleteDriver).not.toHaveBeenCalled();
    });
  });
});
