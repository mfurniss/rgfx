import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { registerRestartDriverHandler } from '../restart-driver-handler';
import type { DriverRegistry } from '@/driver-registry';
import type { MqttBroker } from '@/network';
import { Driver } from '@/types';
import { createMockDriver } from '@/__tests__/factories';
import { eventBus } from '@/services/event-bus';

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

describe('registerRestartDriverHandler', () => {
  let mockDriverRegistry: MockProxy<DriverRegistry>;
  let mockMqtt: MockProxy<MqttBroker>;
  let mockDriver: Driver;
  let registeredHandler: (
    event: unknown,
    driverId: string,
  ) => Promise<{ success: boolean }>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockDriver = createMockDriver({ state: 'connected' });

    mockDriverRegistry = mock<DriverRegistry>();
    mockDriverRegistry.getDriver.mockReturnValue(mockDriver);

    mockMqtt = mock<MqttBroker>();
    mockMqtt.publish.mockResolvedValue(undefined);

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (
        _channel: string,
        handler: (event: unknown, driverId: string) => Promise<{ success: boolean }>,
      ) => {
        registeredHandler = handler;
      },
    );

    registerRestartDriverHandler({
      driverRegistry: mockDriverRegistry,
      mqtt: mockMqtt,
    });
  });

  it('registers the driver:restart handler', async () => {
    const { ipcMain } = await import('electron');
    expect(ipcMain.handle).toHaveBeenCalledWith('driver:restart', expect.any(Function));
  });

  describe('handler behavior', () => {
    it('throws error when driver not found', async () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      await expect(registeredHandler({}, 'nonexistent-driver')).rejects.toThrow(
        'No driver found with ID nonexistent-driver',
      );
    });

    it('throws error when driver is not connected', async () => {
      const disconnectedDriver = createMockDriver({ state: 'disconnected' });
      mockDriverRegistry.getDriver.mockReturnValue(disconnectedDriver);

      await expect(registeredHandler({}, 'rgfx-driver-0001')).rejects.toThrow(
        'Driver rgfx-driver-0001 is not connected',
      );
    });

    it('emits driver:restarting event', async () => {
      await registeredHandler({}, 'rgfx-driver-0001');

      expect(eventBus.emit).toHaveBeenCalledWith('driver:restarting', { driver: mockDriver });
    });

    it('publishes reboot command to MQTT using MAC address', async () => {
      await registeredHandler({}, 'rgfx-driver-0001');

      // Topics use MAC address (immutable) instead of driver ID
      expect(mockMqtt.publish).toHaveBeenCalledWith(
        `rgfx/driver/${mockDriver.mac}/reboot`,
        '',
      );
    });

    it('sets driver state to disconnected', async () => {
      await registeredHandler({}, 'rgfx-driver-0001');

      expect(mockDriver.state).toBe('disconnected');
      expect(mockDriver.ip).toBeUndefined();
    });

    it('emits driver:disconnected event with restarting reason', async () => {
      await registeredHandler({}, 'rgfx-driver-0001');

      expect(eventBus.emit).toHaveBeenCalledWith('driver:disconnected', {
        driver: mockDriver,
        reason: 'restarting',
      });
    });

    it('returns success when operation completes', async () => {
      const result = await registeredHandler({}, 'rgfx-driver-0001');

      expect(result).toEqual({ success: true });
    });

    it('emits events in correct order', async () => {
      const emitCalls: string[] = [];
      (eventBus.emit as ReturnType<typeof vi.fn>).mockImplementation((event: string) => {
        emitCalls.push(event);
      });

      await registeredHandler({}, 'rgfx-driver-0001');

      expect(emitCalls).toEqual(['driver:restarting', 'driver:disconnected']);
    });
  });
});
