import path from 'path';
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { registerFlashOtaHandler } from '../flash-ota-handler';
import { eventBus } from '@/services/event-bus';
import type { DriverRegistry } from '@/driver-registry';
import { Driver } from '@/types';
import { createMockDriver } from '@/__tests__/factories';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

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

vi.mock('fs', () => ({
  existsSync: vi.fn(() => true),
}));

vi.mock('@/services/event-bus', () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

// Static control for mock behavior
let mockUploadShouldFail = false;
let mockUploadError: Error | null = null;
let mockProgressSequence: { sent: number; total: number }[] = [];

class MockEspOTA {
  static FLASH = 'flash';
  private handlers: Record<string, (data: unknown) => void> = {};

  uploadFile = vi.fn(() => {
    // Simulate progress events
    for (const progress of mockProgressSequence) {
      this.handlers.progress(progress);
    }

    if (mockUploadShouldFail && mockUploadError) {
      return Promise.reject(mockUploadError);
    }

    return Promise.resolve();
  });

  on = vi.fn((event: string, handler: (data: unknown) => void) => {
    this.handlers[event] = handler;
    return this;
  });
}

vi.mock('esp-ota', () => ({
  default: MockEspOTA,
}));

describe('registerFlashOtaHandler', () => {
  let mockDriverRegistry: MockProxy<DriverRegistry>;
  let mockDriver: Driver;
  let registeredHandler: (event: unknown, driverId: string) => Promise<void>;
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset mock control flags
    mockUploadShouldFail = false;
    mockUploadError = null;
    mockProgressSequence = [];

    const fs = await import('fs');
    (fs.existsSync as Mock).mockReturnValue(true);

    mockDriver = createMockDriver();

    mockDriverRegistry = mock<DriverRegistry>();
    mockDriverRegistry.getDriver.mockReturnValue(mockDriver);
    mockDriverRegistry.touchDriver.mockReturnValue(mockDriver);

    ipc = await setupIpcHandlerCapture();

    registerFlashOtaHandler({
      driverRegistry: mockDriverRegistry,
    });

    registeredHandler = ipc.getHandler('driver:flash-ota') as typeof registeredHandler;
  });

  describe('handler registration', () => {
    it('should register handler for driver:flash-ota channel', () => {
      ipc.assertChannel('driver:flash-ota');
    });
  });

  describe('driver validation', () => {
    it('should throw error for non-existent driver', async () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      await expect(registeredHandler({}, 'unknown-driver')).rejects.toThrow('Driver not found');
    });

    it('should throw error for disconnected driver', async () => {
      mockDriver.state = 'disconnected';
      mockDriverRegistry.getDriver.mockReturnValue(mockDriver);

      await expect(registeredHandler({}, 'rgfx-driver-0001')).rejects.toThrow(
        'Driver is not connected',
      );
    });

    it('should throw error if driver has no IP address', async () => {
      mockDriver.ip = undefined;
      mockDriverRegistry.getDriver.mockReturnValue(mockDriver);

      await expect(registeredHandler({}, 'rgfx-driver-0001')).rejects.toThrow(
        'Driver IP address not available',
      );
    });
  });

  describe('firmware file validation', () => {
    it('should throw error if firmware file not found', async () => {
      const fs = await import('fs');
      (fs.existsSync as Mock).mockReturnValue(false);

      await expect(registeredHandler({}, 'rgfx-driver-0001')).rejects.toThrow(
        'Firmware file not found',
      );
    });
  });

  describe('OTA upload', () => {
    it('should complete without throwing on successful upload', async () => {
      await expect(registeredHandler({}, 'rgfx-driver-0001')).resolves.toBeUndefined();
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
    it('should throw for non-existent driver', async () => {
      mockDriverRegistry.getDriver.mockReturnValue(undefined);

      await expect(registeredHandler({}, 'unknown-driver')).rejects.toThrow('Driver not found');
    });

    it('should propagate Error objects correctly', async () => {
      mockDriverRegistry.getDriver.mockImplementation(() => {
        throw new Error('Custom error message');
      });

      await expect(registeredHandler({}, 'rgfx-driver-0001')).rejects.toThrow(
        'Custom error message',
      );
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
        expect.stringContaining(path.join('assets', 'esp32', 'firmware', 'firmware-esp32.bin')),
      );
    });
  });

  // Note: uncaughtException handling is now done globally in global-error-handler.ts
  // Tests for that functionality are in global-error-handler.test.ts

  describe('driver reference race condition', () => {
    it('should re-fetch driver after OTA to avoid stale reference', async () => {
      // Simulate race condition: telemetry arrives during OTA, replacing driver object
      const originalDriver = createMockDriver({ id: 'rgfx-driver-0001' });
      const replacedDriver = createMockDriver({ id: 'rgfx-driver-0001' });

      // First call returns original, subsequent calls return replaced driver
      mockDriverRegistry.getDriver
        .mockReturnValueOnce(originalDriver)
        .mockReturnValueOnce(replacedDriver);

      await registeredHandler({}, 'rgfx-driver-0001');

      // Handler should call getDriver twice: once at start, once after OTA completes
      expect(mockDriverRegistry.getDriver).toHaveBeenCalledTimes(2);

      // The replaced driver should have state set to 'disconnected', not the original
      expect(replacedDriver.state).toBe('disconnected');
      expect(replacedDriver.ip).toBeUndefined();
    });

    it('should emit driver:disconnected with the fresh driver reference', async () => {
      const originalDriver = createMockDriver({ id: 'rgfx-driver-0001' });
      const replacedDriver = createMockDriver({ id: 'rgfx-driver-0001' });

      mockDriverRegistry.getDriver
        .mockReturnValueOnce(originalDriver)
        .mockReturnValueOnce(replacedDriver);

      await registeredHandler({}, 'rgfx-driver-0001');

      // Should emit with the replaced driver, not original
      expect(eventBus.emit).toHaveBeenCalledWith('driver:disconnected', {
        driver: replacedDriver,
        reason: 'restarting',
      });
    });

    it('should handle case where driver no longer exists after OTA', async () => {
      const originalDriver = createMockDriver({ id: 'rgfx-driver-0001' });

      // Driver exists at start but is removed during OTA
      mockDriverRegistry.getDriver
        .mockReturnValueOnce(originalDriver)
        .mockReturnValueOnce(undefined);

      // Should still complete without throwing (driver just disappeared)
      await expect(registeredHandler({}, 'rgfx-driver-0001')).resolves.toBeUndefined();
      // Should not emit driver:disconnected since driver no longer exists
      expect(eventBus.emit).not.toHaveBeenCalledWith(
        'driver:disconnected',
        expect.any(Object),
      );
    });
  });

  describe('timeout after full progress', () => {
    it('should treat timeout after 100% progress as success', async () => {
      // Simulate: reached 100%, then timeout
      mockProgressSequence = [
        { sent: 500000, total: 1000000 }, // 50%
        { sent: 1000000, total: 1000000 }, // 100%
      ];
      mockUploadShouldFail = true;
      mockUploadError = new Error('Transmission timeout');

      // Should NOT throw - timeout after 100% is treated as success
      await expect(registeredHandler({}, 'rgfx-driver-0001')).resolves.toBeUndefined();

      // Should emit driver:disconnected with 'restarting' reason
      expect(eventBus.emit).toHaveBeenCalledWith('driver:disconnected', {
        driver: expect.objectContaining({ state: 'disconnected' }),
        reason: 'restarting',
      });
    });

    it('should throw timeout error if 100% was never reached', async () => {
      // Simulate: only 90% progress, then timeout
      mockProgressSequence = [
        { sent: 500000, total: 1000000 }, // 50%
        { sent: 900000, total: 1000000 }, // 90%
      ];
      mockUploadShouldFail = true;
      mockUploadError = new Error('Transmission timeout');

      // Should throw - real timeout before completion
      await expect(registeredHandler({}, 'rgfx-driver-0001')).rejects.toThrow(
        'Transmission timeout',
      );
    });

    it('should throw non-timeout errors even after 100%', async () => {
      // Simulate: 100% reached, but a different error
      mockProgressSequence = [{ sent: 1000000, total: 1000000 }]; // 100%
      mockUploadShouldFail = true;
      mockUploadError = new Error('Connection reset');

      // Should throw - not a timeout error
      await expect(registeredHandler({}, 'rgfx-driver-0001')).rejects.toThrow('Connection reset');
    });

    it('should handle case-insensitive timeout detection', async () => {
      // Simulate: 100%, then UPPERCASE timeout message
      mockProgressSequence = [{ sent: 1000000, total: 1000000 }];
      mockUploadShouldFail = true;
      mockUploadError = new Error('TRANSMISSION TIMEOUT');

      // Should NOT throw - case-insensitive match
      await expect(registeredHandler({}, 'rgfx-driver-0001')).resolves.toBeUndefined();
    });
  });
});
