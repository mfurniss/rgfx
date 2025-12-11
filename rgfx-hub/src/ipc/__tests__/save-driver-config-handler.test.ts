/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerSaveDriverConfigHandler } from '../save-driver-config-handler';
import type { DriverPersistence } from '@/driver-persistence';
import type { DriverRegistry } from '@/driver-registry';
import type { LEDHardwareManager } from '@/led-hardware-manager';
import type { PersistedDriverInput } from '@/schemas';
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

describe('registerSaveDriverConfigHandler', () => {
  let mockDriverPersistence: {
    getDriverByMac: ReturnType<typeof vi.fn>;
    getDriver: ReturnType<typeof vi.fn>;
    addDriver: ReturnType<typeof vi.fn>;
    updateDriver: ReturnType<typeof vi.fn>;
    setLEDConfig: ReturnType<typeof vi.fn>;
    setRemoteLogging: ReturnType<typeof vi.fn>;
    deleteDriver: ReturnType<typeof vi.fn>;
  };
  let mockDriverRegistry: {
    refreshDriverFromPersistence: ReturnType<typeof vi.fn>;
  };
  let mockLedHardwareManager: LEDHardwareManager;
  let mockUploadConfigToDriver: ReturnType<typeof vi.fn>;
  let mockGetMainWindow: ReturnType<typeof vi.fn>;
  let mockMainWindow: { webContents: { send: ReturnType<typeof vi.fn> } };
  type HandlerFn = (
    event: unknown,
    config: PersistedDriverInput
  ) => Promise<{ success: boolean }>;
  let registeredHandler: HandlerFn;

  const existingDriver: PersistedDriverInput = {
    id: 'old-driver-id',
    macAddress: 'AA:BB:CC:DD:EE:FF',
    description: 'Original description',
    ledConfig: {
      hardwareRef: 'ws2812b-strip',
      pin: 16,
      offset: 0,
    },
    remoteLogging: 'errors',
  };

  const runtimeDriver: Driver = {
    id: 'old-driver-id',
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
      telemetryEventsReceived: 0,
      mqttMessagesReceived: 0,
      mqttMessagesFailed: 0,
      udpMessagesSent: 0,
      udpMessagesFailed: 0,
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockDriverPersistence = {
      getDriverByMac: vi.fn(() => ({ ...existingDriver })),
      getDriver: vi.fn(() => undefined),
      addDriver: vi.fn(),
      updateDriver: vi.fn(),
      setLEDConfig: vi.fn(),
      setRemoteLogging: vi.fn(),
      deleteDriver: vi.fn(),
    };

    mockDriverRegistry = {
      refreshDriverFromPersistence: vi.fn(() => structuredClone(runtimeDriver)),
    };

    mockLedHardwareManager = {} as LEDHardwareManager;
    mockUploadConfigToDriver = vi.fn(() => Promise.resolve());
    mockMainWindow = {
      webContents: { send: vi.fn() },
    };
    mockGetMainWindow = vi.fn(() => mockMainWindow);

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (_channel: string, handler: HandlerFn) => {
        registeredHandler = handler;
      },
    );

    registerSaveDriverConfigHandler({
      driverPersistence: mockDriverPersistence as unknown as DriverPersistence,
      driverRegistry: mockDriverRegistry as unknown as DriverRegistry,
      ledHardwareManager: mockLedHardwareManager,
      uploadConfigToDriver: mockUploadConfigToDriver,
      getMainWindow: mockGetMainWindow,
    });
  });

  describe('handler registration', () => {
    it('should register handler for driver:save-config channel', async () => {
      const { ipcMain } = await import('electron');
      expect(ipcMain.handle).toHaveBeenCalledWith('driver:save-config', expect.any(Function));
    });
  });

  describe('schema validation', () => {
    it('should reject config with invalid MAC address format', async () => {
      const invalidConfig = {
        id: 'valid-id',
        macAddress: 'invalid-mac',
      };

      await expect(registeredHandler({}, invalidConfig as PersistedDriverInput))
        .rejects.toThrow('Invalid driver configuration');
    });

    it('should reject config with empty ID', async () => {
      const invalidConfig = {
        id: '',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await expect(registeredHandler({}, invalidConfig as PersistedDriverInput))
        .rejects.toThrow('Invalid driver configuration');
    });

    it('should reject config with ID exceeding max length', async () => {
      const invalidConfig = {
        id: 'a'.repeat(33),
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await expect(registeredHandler({}, invalidConfig as PersistedDriverInput))
        .rejects.toThrow('Invalid driver configuration');
    });

    it('should reject config with invalid ID characters', async () => {
      const invalidConfig = {
        id: 'invalid id!',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await expect(registeredHandler({}, invalidConfig as PersistedDriverInput))
        .rejects.toThrow('Invalid driver configuration');
    });
  });

  describe('driver lookup', () => {
    it('should look up driver by MAC address', async () => {
      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      expect(mockDriverPersistence.getDriverByMac).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    });

    it('should throw error if driver not found by MAC', async () => {
      mockDriverPersistence.getDriverByMac.mockReturnValue(undefined);

      const config: PersistedDriverInput = {
        id: 'some-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await expect(registeredHandler({}, config))
        .rejects.toThrow('Driver with MAC AA:BB:CC:DD:EE:FF not found');
    });
  });

  describe('driver rename workflow', () => {
    it('should detect rename when new ID differs from existing ID', async () => {
      const config: PersistedDriverInput = {
        id: 'new-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      expect(mockDriverPersistence.addDriver).toHaveBeenCalledWith('new-driver-id', 'AA:BB:CC:DD:EE:FF');
      expect(mockDriverPersistence.deleteDriver).toHaveBeenCalledWith('old-driver-id');
    });

    it('should reject rename if new ID already exists', async () => {
      mockDriverPersistence.getDriver.mockReturnValue({ id: 'new-driver-id' });

      const config: PersistedDriverInput = {
        id: 'new-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await expect(registeredHandler({}, config))
        .rejects.toThrow('Driver ID "new-driver-id" already exists');
    });

    it('should copy description when renaming', async () => {
      const config: PersistedDriverInput = {
        id: 'new-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      expect(mockDriverPersistence.updateDriver).toHaveBeenCalledWith(
        'new-driver-id',
        expect.objectContaining({ description: 'Original description' }),
      );
    });

    it('should copy LED config when renaming', async () => {
      const config: PersistedDriverInput = {
        id: 'new-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      expect(mockDriverPersistence.setLEDConfig).toHaveBeenCalledWith(
        'new-driver-id',
        existingDriver.ledConfig,
      );
    });

    it('should copy remoteLogging setting when renaming', async () => {
      const config: PersistedDriverInput = {
        id: 'new-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      expect(mockDriverPersistence.setRemoteLogging).toHaveBeenCalledWith('new-driver-id', 'errors');
    });

    it('should skip copying description if none exists', async () => {
      mockDriverPersistence.getDriverByMac.mockReturnValue({
        ...existingDriver,
        description: undefined,
      });

      const config: PersistedDriverInput = {
        id: 'new-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      // First call should be for the new description update, not the copy
      const updateCalls = mockDriverPersistence.updateDriver.mock.calls;
      const copyDescriptionCall = updateCalls.find(
        (call) => call[0] === 'new-driver-id' && call[1]?.description === undefined,
      );
      expect(copyDescriptionCall).toBeUndefined();
    });

    it('should skip copying LED config if none exists', async () => {
      mockDriverPersistence.getDriverByMac.mockReturnValue({
        ...existingDriver,
        ledConfig: undefined,
      });

      const config: PersistedDriverInput = {
        id: 'new-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      // setLEDConfig should still be called once for the new config update, but not for copying
      const ledConfigCalls = mockDriverPersistence.setLEDConfig.mock.calls;
      const copyLedCall = ledConfigCalls.find((call) => call[1] === undefined);
      expect(copyLedCall).toBeUndefined();
    });
  });

  describe('config updates without rename', () => {
    it('should not create new driver when ID unchanged', async () => {
      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        description: 'Updated description',
      };

      await registeredHandler({}, config);

      expect(mockDriverPersistence.addDriver).not.toHaveBeenCalled();
      expect(mockDriverPersistence.deleteDriver).not.toHaveBeenCalled();
    });

    it('should update description when changed', async () => {
      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        description: 'New description',
      };

      await registeredHandler({}, config);

      expect(mockDriverPersistence.updateDriver).toHaveBeenCalledWith(
        'old-driver-id',
        { description: 'New description' },
      );
    });

    it('should skip description update when unchanged', async () => {
      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        description: 'Original description',
      };

      await registeredHandler({}, config);

      // updateDriver should not be called for description
      const updateCalls = mockDriverPersistence.updateDriver.mock.calls;
      const descriptionUpdateCall = updateCalls.find(
        (call) => call[0] === 'old-driver-id' && call[1]?.description,
      );
      expect(descriptionUpdateCall).toBeUndefined();
    });

    it('should update LED config when provided', async () => {
      const newLedConfig = {
        hardwareRef: 'ws2812b-matrix',
        pin: 18,
        offset: 10,
      };

      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        ledConfig: newLedConfig,
      };

      await registeredHandler({}, config);

      expect(mockDriverPersistence.setLEDConfig).toHaveBeenCalledWith('old-driver-id', newLedConfig);
    });

    it('should update remoteLogging when changed', async () => {
      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        remoteLogging: 'all',
      };

      await registeredHandler({}, config);

      expect(mockDriverPersistence.setRemoteLogging).toHaveBeenCalledWith('old-driver-id', 'all');
    });

    it('should skip remoteLogging update when unchanged', async () => {
      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        remoteLogging: 'errors',
      };

      await registeredHandler({}, config);

      // setRemoteLogging should not be called when value unchanged
      const loggingCalls = mockDriverPersistence.setRemoteLogging.mock.calls;
      const unchangedCall = loggingCalls.find(
        (call) => call[0] === 'old-driver-id' && call[1] === 'errors',
      );
      expect(unchangedCall).toBeUndefined();
    });
  });

  describe('registry refresh and renderer notification', () => {
    it('should refresh driver from persistence after save', async () => {
      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      expect(mockDriverRegistry.refreshDriverFromPersistence).toHaveBeenCalledWith(
        'AA:BB:CC:DD:EE:FF',
        mockLedHardwareManager,
      );
    });

    it('should send driver:updated to renderer when window available', async () => {
      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      expect(mockMainWindow.webContents.send).toHaveBeenCalledWith(
        'driver:updated',
        expect.objectContaining({ id: 'old-driver-id' }),
      );
    });

    it('should not send to renderer when window is null', async () => {
      mockGetMainWindow.mockReturnValue(null);

      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      expect(mockMainWindow.webContents.send).not.toHaveBeenCalled();
    });

    it('should not notify renderer if refresh returns undefined', async () => {
      mockDriverRegistry.refreshDriverFromPersistence.mockReturnValue(undefined);

      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      expect(mockGetMainWindow).not.toHaveBeenCalled();
    });
  });

  describe('connected driver config upload', () => {
    it('should upload config when driver is connected', async () => {
      const connectedDriver = structuredClone(runtimeDriver);
      connectedDriver.connected = true;
      mockDriverRegistry.refreshDriverFromPersistence.mockReturnValue(connectedDriver);

      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      expect(mockUploadConfigToDriver).toHaveBeenCalledWith('AA:BB:CC:DD:EE:FF');
    });

    it('should not upload config when driver is disconnected', async () => {
      const disconnectedDriver = structuredClone(runtimeDriver);
      disconnectedDriver.connected = false;
      mockDriverRegistry.refreshDriverFromPersistence.mockReturnValue(disconnectedDriver);

      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      expect(mockUploadConfigToDriver).not.toHaveBeenCalled();
    });

    it('should not upload if refresh returns undefined', async () => {
      mockDriverRegistry.refreshDriverFromPersistence.mockReturnValue(undefined);

      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      expect(mockUploadConfigToDriver).not.toHaveBeenCalled();
    });
  });

  describe('return value', () => {
    it('should return success: true on successful save', async () => {
      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      const result = await registeredHandler({}, config);

      expect(result).toEqual({ success: true });
    });
  });

  describe('execution flow', () => {
    it('should validate schema before looking up driver', async () => {
      const callOrder: string[] = [];
      mockDriverPersistence.getDriverByMac.mockImplementation(() => {
        callOrder.push('getDriverByMac');
        return { ...existingDriver };
      });

      const invalidConfig = { id: '', macAddress: 'AA:BB:CC:DD:EE:FF' };

      try {
        await registeredHandler({}, invalidConfig as PersistedDriverInput);
      } catch {
        // Expected
      }

      expect(callOrder).not.toContain('getDriverByMac');
    });

    it('should complete rename before updating fields', async () => {
      const callOrder: string[] = [];

      mockDriverPersistence.addDriver.mockImplementation(() => {
        callOrder.push('addDriver');
      });
      mockDriverPersistence.deleteDriver.mockImplementation(() => {
        callOrder.push('deleteDriver');
      });
      mockDriverPersistence.setLEDConfig.mockImplementation(() => {
        callOrder.push('setLEDConfig');
      });

      const config: PersistedDriverInput = {
        id: 'new-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
        ledConfig: { hardwareRef: 'test', pin: 16 },
      };

      await registeredHandler({}, config);

      const addIndex = callOrder.indexOf('addDriver');
      const deleteIndex = callOrder.indexOf('deleteDriver');
      const lastSetLEDIndex = callOrder.lastIndexOf('setLEDConfig');

      expect(addIndex).toBeLessThan(deleteIndex);
      expect(deleteIndex).toBeLessThan(lastSetLEDIndex);
    });
  });
});
