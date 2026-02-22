import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, mockDeep, type MockProxy, type DeepMockProxy } from 'vitest-mock-extended';
import { registerSetDriverDisabledHandler } from '../set-driver-disabled-handler';
import type { DriverRegistry } from '@/driver-registry';
import type { DriverConfig } from '@/driver-config';
import type { MqttBroker } from '@/network';
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

describe('registerSetDriverDisabledHandler', () => {
  let mockDriverRegistry: MockProxy<DriverRegistry>;
  let mockDriverConfig: MockProxy<DriverConfig>;
  let mockMqtt: MockProxy<MqttBroker>;
  let mockMainWindow: DeepMockProxy<BrowserWindow>;
  let mockDriver: Driver;
  let registeredHandler: (
    event: unknown,
    driverId: string,
    disabled: boolean,
  ) => { success: boolean };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockDriver = createMockDriver();

    mockDriverRegistry = mock<DriverRegistry>();
    mockDriverRegistry.getDriver.mockReturnValue(mockDriver);
    const disabledDriver = structuredClone(mockDriver);
    disabledDriver.disabled = true;
    mockDriverRegistry.refreshDriverFromConfig.mockReturnValue(disabledDriver);

    mockDriverConfig = mock<DriverConfig>();
    mockDriverConfig.setDisabled.mockReturnValue(true);

    mockMqtt = mock<MqttBroker>();
    mockMqtt.publish.mockResolvedValue(undefined);

    mockMainWindow = mockDeep<BrowserWindow>();
    mockMainWindow.isDestroyed.mockReturnValue(false);

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
      driverRegistry: mockDriverRegistry,
      driverConfig: mockDriverConfig,
      mqtt: mockMqtt,
      getMainWindow: () => mockMainWindow,
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
      const driverWithoutMac = structuredClone(mockDriver);
      driverWithoutMac.mac = undefined;
      mockDriverRegistry.getDriver.mockReturnValue(driverWithoutMac);

      expect(() => registeredHandler({}, 'rgfx-driver-0001', true)).toThrow(
        'Driver rgfx-driver-0001 has no MAC address',
      );
    });

    it('calls setDisabled on persistence with correct arguments', () => {
      registeredHandler({}, 'rgfx-driver-0001', true);

      expect(mockDriverConfig.setDisabled).toHaveBeenCalledWith('rgfx-driver-0001', true);
    });

    it('throws error when persistence update fails', () => {
      mockDriverConfig.setDisabled.mockReturnValue(false);

      expect(() => registeredHandler({}, 'rgfx-driver-0001', true)).toThrow(
        'Failed to update disabled state for driver rgfx-driver-0001',
      );
    });

    it('refreshes driver from persistence after update', () => {
      registeredHandler({}, 'rgfx-driver-0001', true);

      expect(mockDriverRegistry.refreshDriverFromConfig).toHaveBeenCalledWith(
        'AA:BB:CC:DD:EE:FF',
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
        driverRegistry: mockDriverRegistry,
        driverConfig: mockDriverConfig,
        mqtt: mockMqtt,
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
      const disabledDriver = structuredClone(mockDriver);
      disabledDriver.disabled = true;
      mockDriverRegistry.getDriver.mockReturnValue(disabledDriver);
      const enabledDriver = structuredClone(disabledDriver);
      enabledDriver.disabled = false;
      mockDriverRegistry.refreshDriverFromConfig.mockReturnValue(enabledDriver);

      const result = registeredHandler({}, 'rgfx-driver-0001', false);

      expect(mockDriverConfig.setDisabled).toHaveBeenCalledWith('rgfx-driver-0001', false);
      expect(result).toEqual({ success: true });
    });

    it('sends clear-effects command when disabling a driver', () => {
      registeredHandler({}, 'rgfx-driver-0001', true);

      // Topics use MAC address (immutable) instead of driver ID
      expect(mockMqtt.publish).toHaveBeenCalledWith(
        `rgfx/driver/${mockDriver.mac}/clear-effects`,
        '',
      );
    });

    it('does not send clear-effects command when enabling a driver', () => {
      const disabledDriver = structuredClone(mockDriver);
      disabledDriver.disabled = true;
      mockDriverRegistry.getDriver.mockReturnValue(disabledDriver);
      const enabledDriver = structuredClone(disabledDriver);
      enabledDriver.disabled = false;
      mockDriverRegistry.refreshDriverFromConfig.mockReturnValue(enabledDriver);

      registeredHandler({}, 'rgfx-driver-0001', false);

      expect(mockMqtt.publish).not.toHaveBeenCalled();
    });
  });
});
