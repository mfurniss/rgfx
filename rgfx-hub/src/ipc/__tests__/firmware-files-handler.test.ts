/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerFirmwareFilesHandler } from '../firmware-files-handler';

const mockReadFile = vi.fn();

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  app: {
    isPackaged: false,
    getAppPath: () => '/mock/app',
  },
}));

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: (...args: unknown[]) => mockReadFile(...args),
  },
}));

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('registerFirmwareFilesHandler', () => {
  let handlers: Record<string, (...args: unknown[]) => unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();
    handlers = {};

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (channel: string, handler: (...args: unknown[]) => unknown) => {
        handlers[channel] = handler;
      },
    );

    registerFirmwareFilesHandler();
  });

  it('registers firmware:get-manifest handler', async () => {
    const { ipcMain } = await import('electron');
    expect(ipcMain.handle).toHaveBeenCalledWith('firmware:get-manifest', expect.any(Function));
  });

  it('registers firmware:get-file handler', async () => {
    const { ipcMain } = await import('electron');
    expect(ipcMain.handle).toHaveBeenCalledWith('firmware:get-file', expect.any(Function));
  });

  describe('firmware:get-manifest', () => {
    it('reads and parses manifest.json', async () => {
      const manifest = { version: '1.0.0', files: [] };
      mockReadFile.mockResolvedValue(JSON.stringify(manifest));

      const result = await handlers['firmware:get-manifest']({});

      expect(mockReadFile).toHaveBeenCalledWith(expect.stringContaining('manifest.json'), 'utf-8');
      expect(result).toEqual(manifest);
    });

    it('throws on read failure', async () => {
      mockReadFile.mockRejectedValue(new Error('File not found'));

      await expect(handlers['firmware:get-manifest']({})).rejects.toThrow(
        'Failed to load firmware manifest: File not found',
      );
    });
  });

  describe('firmware:get-file', () => {
    it('reads firmware binary file', async () => {
      const buffer = Buffer.from([0x00, 0x01, 0x02]);
      mockReadFile.mockResolvedValue(buffer);

      const result = await handlers['firmware:get-file']({}, 'firmware.bin');

      expect(mockReadFile).toHaveBeenCalledWith(expect.stringContaining('firmware.bin'));
      expect(result).toEqual(buffer);
    });

    it('rejects path traversal with ..', async () => {
      await expect(handlers['firmware:get-file']({}, '../etc/passwd')).rejects.toThrow('Invalid filename');
    });

    it('rejects path traversal with forward slash', async () => {
      await expect(handlers['firmware:get-file']({}, 'sub/firmware.bin')).rejects.toThrow('Invalid filename');
    });

    it('rejects path traversal with backslash', async () => {
      await expect(handlers['firmware:get-file']({}, 'sub\\firmware.bin')).rejects.toThrow('Invalid filename');
    });

    it('throws on read failure', async () => {
      mockReadFile.mockRejectedValue(new Error('ENOENT'));

      await expect(handlers['firmware:get-file']({}, 'missing.bin')).rejects.toThrow(
        'Failed to load firmware file: ENOENT',
      );
    });
  });
});
