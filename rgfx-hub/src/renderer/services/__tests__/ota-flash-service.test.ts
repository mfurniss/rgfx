/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  flashViaOTA,
  getDriversToFlash,
  generateResultMessage,
  type OtaFlashCallbacks,
  type OtaFlashResult,
} from '../ota-flash-service';
import { createMockDriver } from '@/__tests__/factories';
import type { DriverFlashStatus } from '@/renderer/store/ui-store';

// Mock window.rgfx
const mockFlashOTA = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Setup window.rgfx mock - add to existing window object
  (window as any).rgfx = {
    flashOTA: mockFlashOTA,
  };
});

describe('getDriversToFlash', () => {
  it('should return connected drivers matching selected IDs', () => {
    const drivers = [
      createMockDriver({ id: 'driver-1', state: 'connected' }),
      createMockDriver({ id: 'driver-2', state: 'connected' }),
      createMockDriver({ id: 'driver-3', state: 'disconnected' }),
    ];
    const selectedIds = new Set(['driver-1', 'driver-2', 'driver-3']);

    const result = getDriversToFlash(selectedIds, drivers);

    expect(result).toHaveLength(2);
    expect(result.map((d) => d.id)).toEqual(['driver-1', 'driver-2']);
  });

  it('should return empty array when no drivers match', () => {
    const drivers = [createMockDriver({ id: 'driver-1' })];
    const selectedIds = new Set(['non-existent']);

    const result = getDriversToFlash(selectedIds, drivers);

    expect(result).toHaveLength(0);
  });

  it('should filter out disconnected drivers', () => {
    const drivers = [
      createMockDriver({ id: 'driver-1', state: 'disconnected' }),
    ];
    const selectedIds = new Set(['driver-1']);

    const result = getDriversToFlash(selectedIds, drivers);

    expect(result).toHaveLength(0);
  });

  it('should preserve order of selected IDs', () => {
    const drivers = [
      createMockDriver({ id: 'driver-3' }),
      createMockDriver({ id: 'driver-1' }),
      createMockDriver({ id: 'driver-2' }),
    ];
    const selectedIds = new Set(['driver-2', 'driver-1', 'driver-3']);

    const result = getDriversToFlash(selectedIds, drivers);

    // Set iteration order is insertion order
    expect(result.map((d) => d.id)).toEqual(['driver-2', 'driver-1', 'driver-3']);
  });
});

describe('flashViaOTA', () => {
  const createMockCallbacks = (): OtaFlashCallbacks & {
    logs: string[];
    statusChanges: { driverId: string; status: DriverFlashStatus }[];
  } => {
    const logs: string[] = [];
    const statusChanges: { driverId: string; status: DriverFlashStatus }[] = [];
    return {
      logs,
      statusChanges,
      onLog: (message: string) => logs.push(message),
      onDriverStatusChange: (driverId: string, status: DriverFlashStatus) => {
        statusChanges.push({ driverId, status });
      },
    };
  };

  describe('successful flash', () => {
    it('should return success count when all drivers flash successfully', async () => {
      mockFlashOTA.mockResolvedValue(undefined);
      const callbacks = createMockCallbacks();
      const drivers = [
        createMockDriver({ id: 'driver-1' }),
        createMockDriver({ id: 'driver-2' }),
      ];

      const result = await flashViaOTA(drivers, '1.0.0', callbacks);

      expect(result.successCount).toBe(2);
      expect(result.totalCount).toBe(2);
      expect(result.failedDrivers).toHaveLength(0);
    });

    it('should initialize all drivers with pending status', async () => {
      mockFlashOTA.mockResolvedValue(undefined);
      const callbacks = createMockCallbacks();
      const drivers = [
        createMockDriver({ id: 'driver-1' }),
        createMockDriver({ id: 'driver-2' }),
      ];

      await flashViaOTA(drivers, '1.0.0', callbacks);

      // First status change for each driver should be pending
      const pendingStatuses = callbacks.statusChanges.filter(
        (s) => s.status.status === 'pending',
      );
      expect(pendingStatuses).toHaveLength(2);
    });

    it('should update status to flashing when starting', async () => {
      mockFlashOTA.mockResolvedValue(undefined);
      const callbacks = createMockCallbacks();
      const drivers = [createMockDriver({ id: 'driver-1' })];

      await flashViaOTA(drivers, '1.0.0', callbacks);

      const flashingStatus = callbacks.statusChanges.find(
        (s) => s.driverId === 'driver-1' && s.status.status === 'flashing',
      );
      expect(flashingStatus).toBeDefined();
    });

    it('should update status to success on completion', async () => {
      mockFlashOTA.mockResolvedValue(undefined);
      const callbacks = createMockCallbacks();
      const drivers = [createMockDriver({ id: 'driver-1' })];

      await flashViaOTA(drivers, '1.0.0', callbacks);

      const successStatus = callbacks.statusChanges.find(
        (s) => s.driverId === 'driver-1' && s.status.status === 'success',
      );
      expect(successStatus).toBeDefined();
      expect(successStatus?.status.progress).toBe(100);
    });

    it('should log firmware version', async () => {
      mockFlashOTA.mockResolvedValue(undefined);
      const callbacks = createMockCallbacks();
      const drivers = [createMockDriver({ id: 'driver-1' })];

      await flashViaOTA(drivers, '2.0.0', callbacks);

      expect(callbacks.logs.some((log) => log.includes('2.0.0'))).toBe(true);
    });
  });

  describe('partial failure', () => {
    it('should return mixed results when some drivers fail', async () => {
      mockFlashOTA
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Connection failed'));
      const callbacks = createMockCallbacks();
      const drivers = [
        createMockDriver({ id: 'driver-1' }),
        createMockDriver({ id: 'driver-2' }),
      ];

      const result = await flashViaOTA(drivers, '1.0.0', callbacks);

      expect(result.successCount).toBe(1);
      expect(result.totalCount).toBe(2);
      expect(result.failedDrivers).toHaveLength(1);
      expect(result.failedDrivers[0]).toContain('driver-2');
    });

    it('should update failed driver status to error', async () => {
      mockFlashOTA.mockRejectedValue(new Error('Connection failed'));
      const callbacks = createMockCallbacks();
      const drivers = [createMockDriver({ id: 'driver-1' })];

      await flashViaOTA(drivers, '1.0.0', callbacks);

      const errorStatus = callbacks.statusChanges.find(
        (s) => s.driverId === 'driver-1' && s.status.status === 'error',
      );
      expect(errorStatus).toBeDefined();
      expect(errorStatus?.status.error).toBe('Connection failed');
    });
  });

  describe('complete failure', () => {
    it('should return zero success count when all drivers fail', async () => {
      mockFlashOTA.mockRejectedValue(new Error('Connection failed'));
      const callbacks = createMockCallbacks();
      const drivers = [
        createMockDriver({ id: 'driver-1' }),
        createMockDriver({ id: 'driver-2' }),
      ];

      const result = await flashViaOTA(drivers, '1.0.0', callbacks);

      expect(result.successCount).toBe(0);
      expect(result.totalCount).toBe(2);
      expect(result.failedDrivers).toHaveLength(2);
    });
  });

  describe('validation', () => {
    it('should throw when no drivers provided', async () => {
      const callbacks = createMockCallbacks();

      await expect(flashViaOTA([], '1.0.0', callbacks)).rejects.toThrow(
        'No connected drivers selected',
      );
    });
  });

  describe('logging', () => {
    it('should log each driver being flashed', async () => {
      mockFlashOTA.mockResolvedValue(undefined);
      const callbacks = createMockCallbacks();
      const drivers = [
        createMockDriver({ id: 'driver-1', ip: '192.168.1.100' }),
        createMockDriver({ id: 'driver-2', ip: '192.168.1.101' }),
      ];

      await flashViaOTA(drivers, '1.0.0', callbacks);

      expect(callbacks.logs.some((log) => log.includes('driver-1'))).toBe(true);
      expect(callbacks.logs.some((log) => log.includes('driver-2'))).toBe(true);
      expect(callbacks.logs.some((log) => log.includes('192.168.1.100'))).toBe(true);
    });

    it('should log success message for each driver', async () => {
      mockFlashOTA.mockResolvedValue(undefined);
      const callbacks = createMockCallbacks();
      const drivers = [createMockDriver({ id: 'driver-1' })];

      await flashViaOTA(drivers, '1.0.0', callbacks);

      expect(callbacks.logs.some((log) => log.includes('successfully'))).toBe(true);
    });

    it('should log failure message for failed drivers', async () => {
      mockFlashOTA.mockRejectedValue(new Error('Timeout'));
      const callbacks = createMockCallbacks();
      const drivers = [createMockDriver({ id: 'driver-1' })];

      await flashViaOTA(drivers, '1.0.0', callbacks);

      expect(callbacks.logs.some((log) => log.includes('failed'))).toBe(true);
      expect(callbacks.logs.some((log) => log.includes('Timeout'))).toBe(true);
    });
  });
});

describe('generateResultMessage', () => {
  it('should return success message when all drivers succeed', () => {
    const result: OtaFlashResult = {
      successCount: 3,
      totalCount: 3,
      failedDrivers: [],
    };

    const message = generateResultMessage(result, '1.0.0');

    expect(message.success).toBe(true);
    expect(message.message).toContain('1.0.0');
    expect(message.message).toContain('3 driver(s)');
  });

  it('should return partial success message when some fail', () => {
    const result: OtaFlashResult = {
      successCount: 2,
      totalCount: 3,
      failedDrivers: ['driver-3: Connection failed'],
    };

    const message = generateResultMessage(result, '1.0.0');

    expect(message.success).toBe(false);
    expect(message.message).toContain('Partial success');
    expect(message.message).toContain('2 of 3');
    expect(message.message).toContain('driver-3');
  });

  it('should return failure message when all fail', () => {
    const result: OtaFlashResult = {
      successCount: 0,
      totalCount: 2,
      failedDrivers: ['driver-1: Error 1', 'driver-2: Error 2'],
    };

    const message = generateResultMessage(result, '1.0.0');

    expect(message.success).toBe(false);
    expect(message.message).toContain('failed for all');
    expect(message.message).toContain('driver-1');
    expect(message.message).toContain('driver-2');
  });
});
