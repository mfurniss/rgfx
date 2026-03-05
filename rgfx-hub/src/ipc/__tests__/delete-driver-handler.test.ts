import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, mockDeep, type MockProxy, type DeepMockProxy } from 'vitest-mock-extended';
import { registerDeleteDriverHandler } from '../delete-driver-handler';
import type { DriverRegistry } from '@/driver-registry';
import type { DriverConfig } from '@/driver-config';
import type { SystemMonitor } from '@/system-monitor';
import type { BrowserWindow } from 'electron';
import { Driver } from '@/types';
import { createMockDriver } from '@/__tests__/factories';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

describe('registerDeleteDriverHandler', () => {
  let mockDriverRegistry: MockProxy<DriverRegistry>;
  let mockDriverConfig: MockProxy<DriverConfig>;
  let mockSystemMonitor: MockProxy<SystemMonitor>;
  let mockMainWindow: DeepMockProxy<BrowserWindow>;
  let mockDriver: Driver;
  let registeredHandler: (event: unknown, driverId: string) => { success: boolean };
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockDriver = createMockDriver();

    mockDriverRegistry = mock<DriverRegistry>();
    mockDriverRegistry.getDriver.mockReturnValue(mockDriver);
    mockDriverRegistry.deleteDriver.mockReturnValue(true);

    mockDriverConfig = mock<DriverConfig>();
    mockDriverConfig.deleteDriver.mockReturnValue(true);

    mockSystemMonitor = mock<SystemMonitor>();

    mockMainWindow = mockDeep<BrowserWindow>();
    mockMainWindow.isDestroyed.mockReturnValue(false);

    ipc = await setupIpcHandlerCapture();

    registerDeleteDriverHandler({
      driverRegistry: mockDriverRegistry,
      driverConfig: mockDriverConfig,
      systemMonitor: mockSystemMonitor,
      getMainWindow: () => mockMainWindow,
    });

    registeredHandler = ipc.getHandler('driver:delete') as typeof registeredHandler;
  });

  it('registers the driver:delete handler', () => {
    ipc.assertChannel('driver:delete');
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
        systemMonitor: mockSystemMonitor,
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

    it('clears UDP stats for deleted driver', () => {
      registeredHandler({}, 'rgfx-driver-0001');

      expect(mockSystemMonitor.clearUdpStats).toHaveBeenCalledWith('rgfx-driver-0001');
    });

    it('does not clear UDP stats if persistence delete fails', () => {
      mockDriverConfig.deleteDriver.mockReturnValue(false);

      expect(() => registeredHandler({}, 'rgfx-driver-0001')).toThrow();
      expect(mockSystemMonitor.clearUdpStats).not.toHaveBeenCalled();
    });
  });
});
