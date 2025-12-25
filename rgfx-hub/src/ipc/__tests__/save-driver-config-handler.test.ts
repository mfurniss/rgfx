/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { registerSaveDriverConfigHandler } from '../save-driver-config-handler';
import { eventBus } from '@/services/event-bus';
import type { DriverPersistence, PersistedDriver } from '@/driver-persistence';
import type { DriverRegistry } from '@/driver-registry';
import type { LEDHardwareManager } from '@/led-hardware-manager';
import type { MqttBroker } from '@/network';
import type { PersistedDriverInput } from '@/schemas';
import { Driver } from '@/types';
import { createMockDriver } from '@/__tests__/factories';

vi.mocked(eventBus);

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

vi.mock('@/services/event-bus', () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

describe('registerSaveDriverConfigHandler', () => {
  let mockDriverPersistence: MockProxy<DriverPersistence>;
  let mockDriverRegistry: MockProxy<DriverRegistry>;
  let mockLedHardwareManager: MockProxy<LEDHardwareManager>;
  let mockMqtt: MockProxy<MqttBroker>;
  let mockUploadConfigToDriver: ReturnType<typeof vi.fn>;
  type HandlerFn = (
    event: unknown,
    config: PersistedDriverInput
  ) => Promise<{ success: boolean; driverRebooted: boolean }>;
  let registeredHandler: HandlerFn;

  const existingDriver: PersistedDriver = {
    id: 'old-driver-id',
    macAddress: 'AA:BB:CC:DD:EE:FF',
    description: 'Original description',
    ledConfig: {
      hardwareRef: 'ws2812b-strip',
      pin: 16,
      offset: 0,
      floor: { r: 0, g: 0, b: 0 },
    },
    remoteLogging: 'errors',
    disabled: false,
  };

  const runtimeDriver: Driver = createMockDriver({
    id: 'old-driver-id',
    stats: {
      telemetryEventsReceived: 0,
      mqttMessagesReceived: 0,
      mqttMessagesFailed: 0,
    },
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    mockDriverPersistence = mock<DriverPersistence>();
    mockDriverPersistence.getDriverByMac.mockReturnValue({ ...existingDriver });
    mockDriverPersistence.getDriver.mockReturnValue(undefined);

    mockDriverRegistry = mock<DriverRegistry>();
    mockDriverRegistry.refreshDriverFromPersistence.mockReturnValue(structuredClone(runtimeDriver));

    mockLedHardwareManager = mock<LEDHardwareManager>();
    mockMqtt = mock<MqttBroker>();
    mockMqtt.publish.mockResolvedValue(undefined);
    mockUploadConfigToDriver = vi.fn(() => Promise.resolve());

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (_channel: string, handler: HandlerFn) => {
        registeredHandler = handler;
      },
    );

    registerSaveDriverConfigHandler({
      driverPersistence: mockDriverPersistence,
      driverRegistry: mockDriverRegistry,
      ledHardwareManager: mockLedHardwareManager,
      mqtt: mockMqtt,
      uploadConfigToDriver: mockUploadConfigToDriver,
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
      mockDriverPersistence.getDriver.mockReturnValue({
        ...existingDriver,
        id: 'new-driver-id',
      });

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
      const driverWithoutDescription = { ...existingDriver };
      delete (driverWithoutDescription as Partial<PersistedDriver>).description;
      mockDriverPersistence.getDriverByMac.mockReturnValue(driverWithoutDescription);

      const config: PersistedDriverInput = {
        id: 'new-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      // First call should be for the new description update, not the copy
      const updateCalls = mockDriverPersistence.updateDriver.mock.calls;
      const copyDescriptionCall = updateCalls.find(
        (call) => call[0] === 'new-driver-id' && call[1].description === undefined,
      );
      expect(copyDescriptionCall).toBeUndefined();
    });

    it('should skip copying LED config if none exists', async () => {
      const driverWithoutLedConfig = { ...existingDriver };
      delete (driverWithoutLedConfig as Partial<PersistedDriver>).ledConfig;
      mockDriverPersistence.getDriverByMac.mockReturnValue(driverWithoutLedConfig);

      const config: PersistedDriverInput = {
        id: 'new-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      // setLEDConfig should not be called since there's no LED config to copy
      // and no new LED config provided in the input
      expect(mockDriverPersistence.setLEDConfig).not.toHaveBeenCalled();
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
        (call) => call[0] === 'old-driver-id' && call[1].description,
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

      // Zod applies default floor values during validation
      expect(mockDriverPersistence.setLEDConfig).toHaveBeenCalledWith('old-driver-id', {
        ...newLedConfig,
        floor: { r: 0, g: 0, b: 0 },
      });
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

  describe('registry refresh and event bus notification', () => {
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

    it('should emit driver:updated event when driver is refreshed', async () => {
      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'driver:updated',
        expect.objectContaining({
          driver: expect.objectContaining({ id: 'old-driver-id' }),
        }),
      );
    });

    it('should not emit event if refresh returns undefined', async () => {
      mockDriverRegistry.refreshDriverFromPersistence.mockReturnValue(undefined);

      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      expect(eventBus.emit).not.toHaveBeenCalled();
    });
  });

  describe('connected driver config upload', () => {
    it('should upload config when driver is connected', async () => {
      const connectedDriver = structuredClone(runtimeDriver);
      connectedDriver.state = 'connected';
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
      disconnectedDriver.state = 'disconnected';
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
    it('should return success: true, driverRebooted: false when driver not connected', async () => {
      const disconnectedDriver = structuredClone(runtimeDriver);
      disconnectedDriver.state = 'disconnected';
      mockDriverRegistry.refreshDriverFromPersistence.mockReturnValue(disconnectedDriver);

      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      const result = await registeredHandler({}, config);

      expect(result).toEqual({ success: true, driverRebooted: false });
    });

    it('should return success: true, driverRebooted: true when driver is connected', async () => {
      const connectedDriver = structuredClone(runtimeDriver);
      connectedDriver.state = 'connected';
      mockDriverRegistry.refreshDriverFromPersistence.mockReturnValue(connectedDriver);

      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      const result = await registeredHandler({}, config);

      expect(result).toEqual({ success: true, driverRebooted: true });
    });

    it('should emit driver:disconnected with restarting reason when driver is connected', async () => {
      const config: PersistedDriverInput = {
        id: 'old-driver-id',
        macAddress: 'AA:BB:CC:DD:EE:FF',
      };

      await registeredHandler({}, config);

      expect(eventBus.emit).toHaveBeenCalledWith(
        'driver:disconnected',
        expect.objectContaining({
          driver: expect.objectContaining({ id: 'old-driver-id', state: 'disconnected' }),
          reason: 'restarting',
        }),
      );
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
        return true;
      });
      mockDriverPersistence.deleteDriver.mockImplementation(() => {
        callOrder.push('deleteDriver');
        return true;
      });
      mockDriverPersistence.setLEDConfig.mockImplementation(() => {
        callOrder.push('setLEDConfig');
        return true;
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
