import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { registerSetIdHandler } from '../set-id-handler';
import { INVOKE_CHANNELS } from '../contract';
import type { DriverRegistry } from '@/driver-registry';
import type { MqttBroker } from '@/network';
import { Driver } from '@/types';
import { createMockDriver } from '@/__tests__/factories';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

describe('registerSetIdHandler', () => {
  let mockDriverRegistry: MockProxy<DriverRegistry>;
  let mockMqtt: MockProxy<MqttBroker>;
  let mockDriver: Driver;
  let registeredHandler: (event: unknown, driverId: string, newId: string) => Promise<void>;
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockDriver = createMockDriver();

    mockDriverRegistry = mock<DriverRegistry>();
    mockDriverRegistry.getDriver.mockReturnValue(mockDriver);

    mockMqtt = mock<MqttBroker>();
    mockMqtt.publish.mockResolvedValue(undefined);

    ipc = await setupIpcHandlerCapture();

    registerSetIdHandler({
      driverRegistry: mockDriverRegistry,
      mqtt: mockMqtt,
    });

    registeredHandler = ipc.getHandler(INVOKE_CHANNELS.setDriverId) as typeof registeredHandler;
  });

  describe('handler registration', () => {
    it('should register handler for driver:set-id channel', () => {
      ipc.assertChannel(INVOKE_CHANNELS.setDriverId);
    });
  });

  describe('ID validation', () => {
    it('should throw for empty ID', async () => {
      await expect(registeredHandler({}, 'rgfx-driver-0001', '')).rejects.toThrow();
      expect(mockMqtt.publish).not.toHaveBeenCalled();
    });

    it('should throw for ID with spaces', async () => {
      await expect(
        registeredHandler({}, 'rgfx-driver-0001', 'driver with spaces'),
      ).rejects.toThrow();
      expect(mockMqtt.publish).not.toHaveBeenCalled();
    });

    it('should throw for ID that is too long', async () => {
      const longId = 'a'.repeat(33);
      await expect(registeredHandler({}, 'rgfx-driver-0001', longId)).rejects.toThrow();
      expect(mockMqtt.publish).not.toHaveBeenCalled();
    });

    it('should accept valid ID with hyphens', async () => {
      await expect(
        registeredHandler({}, 'rgfx-driver-0001', 'rgfx-driver-0002'),
      ).resolves.toBeUndefined();
      expect(mockMqtt.publish).toHaveBeenCalled();
    });

    it('should accept valid alphanumeric ID', async () => {
      await expect(
        registeredHandler({}, 'rgfx-driver-0001', 'mydriver123'),
      ).resolves.toBeUndefined();
      expect(mockMqtt.publish).toHaveBeenCalled();
    });
  });

  describe('driver validation', () => {
    it('should throw for non-existent driver', async () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      await expect(registeredHandler({}, 'unknown-driver', 'new-id')).rejects.toThrow(
        'No driver found with ID unknown-driver',
      );
    });

    it('should look up driver by provided ID', async () => {
      await registeredHandler({}, 'rgfx-driver-0001', 'new-id');

      expect(mockDriverRegistry.getDriver).toHaveBeenCalledWith('rgfx-driver-0001');
    });
  });

  describe('MQTT publishing', () => {
    it('should publish to correct topic using MAC address', async () => {
      await registeredHandler({}, 'rgfx-driver-0001', 'new-id');

      // Topics use MAC address (immutable) instead of driver ID
      expect(mockMqtt.publish).toHaveBeenCalledWith(
        `rgfx/driver/${mockDriver.mac}/set-id`,
        expect.any(String),
      );
    });

    it('should publish JSON payload with new ID', async () => {
      await registeredHandler({}, 'rgfx-driver-0001', 'new-driver-id');

      const publishCall = mockMqtt.publish.mock.calls[0];
      const payload = JSON.parse(publishCall[1]) as { id: string };

      expect(payload.id).toBe('new-driver-id');
    });
  });

  describe('error handling', () => {
    it('should throw when MQTT publish fails', async () => {
      mockMqtt.publish.mockRejectedValue(new Error('MQTT error'));

      await expect(registeredHandler({}, 'rgfx-driver-0001', 'new-id')).rejects.toThrow(
        'MQTT error',
      );
    });

    it('should throw for non-existent driver', async () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      await expect(registeredHandler({}, 'unknown-driver', 'new-id')).rejects.toThrow(
        'No driver found with ID unknown-driver',
      );
    });
  });

  describe('success response', () => {
    it('should complete without throwing on successful ID change', async () => {
      await expect(registeredHandler({}, 'rgfx-driver-0001', 'new-id')).resolves.toBeUndefined();
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
