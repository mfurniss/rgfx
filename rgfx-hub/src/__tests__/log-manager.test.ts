/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type * as fs from 'fs';
import { LogManager } from '../log-manager';
import type { DriverLogPersistence } from '../driver-log-persistence';

vi.mock('electron-log/main', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'logs') {
        return '/mock/logs';
      }

      return `/mock/${name}`;
    }),
  },
}));

// Hoist mock functions so they can be used in vi.mock factory
const { mockStat, mockReaddir, mockWriteFile } = vi.hoisted(() => ({
  mockStat: vi.fn<(path: fs.PathLike) => Promise<fs.Stats>>(),
  mockReaddir: vi.fn<(path: fs.PathLike) => Promise<string[]>>(),
  mockWriteFile: vi.fn<(path: fs.PathLike, data: string, encoding: string) => Promise<void>>(),
}));

vi.mock('fs', () => ({
  promises: {
    stat: mockStat,
    readdir: mockReaddir,
    writeFile: mockWriteFile,
  },
}));

describe('LogManager', () => {
  let mockDriverLogPersistence: DriverLogPersistence;
  let logManager: LogManager;

  beforeEach(() => {
    vi.clearAllMocks();

    mockDriverLogPersistence = {
      appendLog: vi.fn(),
      getLogFilePath: vi.fn((driverId: string) => `/mock/.rgfx/logs/${driverId}.log`),
    } as unknown as DriverLogPersistence;

    logManager = new LogManager('/mock/.rgfx', mockDriverLogPersistence);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getSizes', () => {
    it('should return null for non-existent log files', async () => {
      mockStat.mockRejectedValue(new Error('ENOENT'));
      mockReaddir.mockRejectedValue(new Error('ENOENT'));

      const sizes = await logManager.getSizes();

      expect(sizes.system).toBeNull();
      expect(sizes.events).toBeNull();
      expect(sizes.drivers).toEqual([]);
    });

    it('should return sizes for existing log files', async () => {
      mockStat.mockImplementation((path) => {
        if (path === '/mock/logs/main.log') {
          return Promise.resolve({ size: 1024 } as fs.Stats);
        }

        if (path === '/mock/.rgfx/interceptor_events.log') {
          return Promise.resolve({ size: 2048 } as fs.Stats);
        }

        if (path === '/mock/.rgfx/logs/driver-1.log') {
          return Promise.resolve({ size: 512 } as fs.Stats);
        }

        return Promise.reject(new Error('ENOENT'));
      });

      mockReaddir.mockResolvedValue(['driver-1.log']);

      const sizes = await logManager.getSizes();

      expect(sizes.system).toEqual({ path: '/mock/logs/main.log', size: 1024 });
      expect(sizes.events).toEqual({ path: '/mock/.rgfx/interceptor_events.log', size: 2048 });
      expect(sizes.drivers).toEqual([
        { driverId: 'driver-1', path: '/mock/.rgfx/logs/driver-1.log', size: 512 },
      ]);
    });

    it('should handle multiple driver logs', async () => {
      mockStat.mockImplementation((path) => {
        if (path === '/mock/.rgfx/logs/driver-1.log') {
          return Promise.resolve({ size: 100 } as fs.Stats);
        }

        if (path === '/mock/.rgfx/logs/driver-2.log') {
          return Promise.resolve({ size: 200 } as fs.Stats);
        }

        return Promise.reject(new Error('ENOENT'));
      });

      mockReaddir.mockResolvedValue(['driver-1.log', 'driver-2.log', 'not-a-log.txt']);

      const sizes = await logManager.getSizes();

      expect(sizes.drivers).toHaveLength(2);
      expect(sizes.drivers).toContainEqual({
        driverId: 'driver-1',
        path: '/mock/.rgfx/logs/driver-1.log',
        size: 100,
      });
      expect(sizes.drivers).toContainEqual({
        driverId: 'driver-2',
        path: '/mock/.rgfx/logs/driver-2.log',
        size: 200,
      });
    });
  });

  describe('clearAll', () => {
    it('should clear all existing log files', async () => {
      mockStat.mockImplementation((path) => {
        if (path === '/mock/logs/main.log') {
          return Promise.resolve({ size: 1024 } as fs.Stats);
        }

        if (path === '/mock/.rgfx/interceptor_events.log') {
          return Promise.resolve({ size: 2048 } as fs.Stats);
        }

        if (path === '/mock/.rgfx/logs/driver-1.log') {
          return Promise.resolve({ size: 512 } as fs.Stats);
        }

        return Promise.reject(new Error('ENOENT'));
      });

      mockReaddir.mockResolvedValue(['driver-1.log']);
      mockWriteFile.mockResolvedValue();

      await logManager.clearAll();

      expect(mockWriteFile).toHaveBeenCalledWith('/mock/logs/main.log', '', 'utf8');
      expect(mockWriteFile).toHaveBeenCalledWith('/mock/.rgfx/interceptor_events.log', '', 'utf8');
      expect(mockWriteFile).toHaveBeenCalledWith('/mock/.rgfx/logs/driver-1.log', '', 'utf8');
    });

    it('should handle errors gracefully when clearing files', async () => {
      mockStat.mockResolvedValue({ size: 100 } as fs.Stats);
      mockReaddir.mockResolvedValue([]);
      mockWriteFile.mockRejectedValue(new Error('Permission denied'));

      // Should not throw
      await expect(logManager.clearAll()).resolves.toBeUndefined();
    });

    it('should not attempt to clear non-existent logs', async () => {
      mockStat.mockRejectedValue(new Error('ENOENT'));
      mockReaddir.mockRejectedValue(new Error('ENOENT'));

      await logManager.clearAll();

      expect(mockWriteFile).not.toHaveBeenCalled();
    });
  });
});
