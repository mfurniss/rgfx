/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installDefaultTransformers, getTransformersDir } from '@/transformer-installer';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: vi.fn(() => '/app'),
  },
}));

// Use vi.hoisted to create mock functions that are available during vi.mock hoisting
const { mockMkdir, mockReaddir, mockAccess, mockCopyFile, mockLogInfo, mockLogError } = vi.hoisted(
  () => ({
    mockMkdir: vi.fn(),
    mockReaddir: vi.fn(),
    mockAccess: vi.fn(),
    mockCopyFile: vi.fn(),
    mockLogInfo: vi.fn(),
    mockLogError: vi.fn(),
  }),
);

vi.mock('electron-log/main', () => ({
  default: {
    info: mockLogInfo,
    error: mockLogError,
  },
}));

vi.mock('node:fs', () => ({
  default: {
    promises: {
      mkdir: mockMkdir,
      readdir: mockReaddir,
      access: mockAccess,
      copyFile: mockCopyFile,
    },
  },
  promises: {
    mkdir: mockMkdir,
    readdir: mockReaddir,
    access: mockAccess,
    copyFile: mockCopyFile,
  },
}));

vi.mock('@/config/paths', () => ({
  TRANSFORMERS_DIRECTORY: '/mock/user/.rgfx/transformers',
}));

describe('transformer-installer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTransformersDir', () => {
    it('should return user config path', () => {
      const result = getTransformersDir();
      expect(result).toBe('/mock/user/.rgfx/transformers');
    });
  });

  describe('installDefaultTransformers', () => {
    it('should copy files to empty directory', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'default.js', isDirectory: () => false, isFile: () => true },
      ]);

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockCopyFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultTransformers();

      expect(mockMkdir).toHaveBeenCalledWith('/mock/user/.rgfx/transformers', { recursive: true });
      expect(mockCopyFile).toHaveBeenCalled();
    });

    it('should skip existing files to preserve user customizations', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'custom.js', isDirectory: () => false, isFile: () => true },
      ]);

      // File already exists
      mockAccess.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultTransformers();

      expect(mockCopyFile).not.toHaveBeenCalled();
      expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('already exists, skipping'));
    });

    it('should handle nested directories (games/, subjects/, patterns/)', async () => {
      // First readdir call for root directory
      mockReaddir
        .mockResolvedValueOnce([
          { name: 'games', isDirectory: () => true, isFile: () => false },
          { name: 'default.js', isDirectory: () => false, isFile: () => true },
        ])
        // Second readdir call for games/ subdirectory
        .mockResolvedValueOnce([
          { name: 'pacman.js', isDirectory: () => false, isFile: () => true },
        ]);

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockCopyFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultTransformers();

      // Should create nested directory
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('games'),
        { recursive: true },
      );

      // Should copy files from both root and subdirectory
      expect(mockCopyFile).toHaveBeenCalledTimes(2);
    });

    it('should handle missing bundled directory', async () => {
      const error = new Error('ENOENT: no such file or directory');
      (error as NodeJS.ErrnoException).code = 'ENOENT';

      mockMkdir.mockResolvedValue(undefined);
      mockReaddir.mockRejectedValue(error);

      await expect(installDefaultTransformers()).rejects.toThrow();

      expect(mockLogError).toHaveBeenCalledWith(
        'Failed to install default transformers:',
        expect.any(Error),
      );
    });

    it('should log installation progress', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'default.js', isDirectory: () => false, isFile: () => true },
      ]);

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockCopyFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultTransformers();

      expect(mockLogInfo).toHaveBeenCalledWith(
        expect.stringContaining('Copying default transformers from'),
      );
      expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('Installing to'));
      expect(mockLogInfo).toHaveBeenCalledWith('Default transformers installation complete');
    });
  });

  describe('getBundledTransformersDir (via installation)', () => {
    it('should use app path for development mode', async () => {
      mockReaddir.mockResolvedValue([]);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultTransformers();

      // In dev mode, should use app.getAppPath() + assets/transformers
      expect(mockLogInfo).toHaveBeenCalledWith(
        expect.stringContaining('/app/assets/transformers'),
      );
    });

    it('should use resourcesPath for packaged mode', async () => {
      const { app } = await import('electron');
      (app as { isPackaged: boolean }).isPackaged = true;

      const originalResourcesPath = process.resourcesPath;
      Object.defineProperty(process, 'resourcesPath', {
        value: '/resources',
        writable: true,
        configurable: true,
      });

      mockReaddir.mockResolvedValue([]);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultTransformers();

      expect(mockLogInfo).toHaveBeenCalledWith(
        expect.stringContaining('/resources/assets/transformers'),
      );

      // Cleanup
      Object.defineProperty(process, 'resourcesPath', {
        value: originalResourcesPath,
        writable: true,
        configurable: true,
      });
      (app as { isPackaged: boolean }).isPackaged = false;
    });
  });
});
