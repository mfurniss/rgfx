import path from 'path';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installDefaultInterceptors } from '@/interceptor-installer';

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
  INTERCEPTORS_DIRECTORY: '/mock/user/.rgfx/interceptors',
}));

describe('interceptor-installer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('installDefaultInterceptors', () => {
    it('should copy .lua files only, excluding type stubs', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'pacman_rgfx.lua', isDirectory: () => false, isFile: () => true },
        { name: 'mame.lua', isDirectory: () => false, isFile: () => true },
        { name: 'readme.md', isDirectory: () => false, isFile: () => true },
        { name: 'notes.txt', isDirectory: () => false, isFile: () => true },
      ]);

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockCopyFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultInterceptors();

      // Should only copy game interceptor .lua files, not type stubs
      expect(mockCopyFile).toHaveBeenCalledTimes(1);
      expect(mockCopyFile).toHaveBeenCalledWith(
        expect.stringContaining('pacman_rgfx.lua'),
        expect.stringContaining('pacman_rgfx.lua'),
      );
      expect(mockCopyFile).not.toHaveBeenCalledWith(
        expect.stringContaining('mame.lua'),
        expect.anything(),
      );
    });

    it('should skip non-.lua and non-.json files (.md, .asm, etc.)', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'README.md', isDirectory: () => false, isFile: () => true },
        { name: 'pacman.asm', isDirectory: () => false, isFile: () => true },
        { name: 'notes.txt', isDirectory: () => false, isFile: () => true },
      ]);

      mockMkdir.mockResolvedValue(undefined);

      await installDefaultInterceptors();

      expect(mockCopyFile).not.toHaveBeenCalled();
    });

    it('should skip existing files to preserve user customizations', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'custom_rgfx.lua', isDirectory: () => false, isFile: () => true },
      ]);

      // File already exists
      mockAccess.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultInterceptors();

      expect(mockCopyFile).not.toHaveBeenCalled();
      expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('already exists, skipping'));
    });

    it('should handle nested directories (games/ subdirectory)', async () => {
      // First readdir call for root directory
      mockReaddir
        .mockResolvedValueOnce([
          { name: 'games', isDirectory: () => true, isFile: () => false },
          { name: 'rom_map.json', isDirectory: () => false, isFile: () => true },
        ])
        // Second readdir call for games/ subdirectory
        .mockResolvedValueOnce([
          { name: 'pacman_rgfx.lua', isDirectory: () => false, isFile: () => true },
          { name: 'galaga_rgfx.lua', isDirectory: () => false, isFile: () => true },
        ]);

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockCopyFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultInterceptors();

      // Should create nested directory
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('games'),
        { recursive: true },
      );

      // Should copy .lua files from both root and subdirectory
      expect(mockCopyFile).toHaveBeenCalledTimes(3);
    });

    it('should handle missing bundled directory', async () => {
      const error = new Error('ENOENT: no such file or directory');
      (error as NodeJS.ErrnoException).code = 'ENOENT';

      mockMkdir.mockResolvedValue(undefined);
      mockReaddir.mockRejectedValue(error);

      await expect(installDefaultInterceptors()).rejects.toThrow();

      expect(mockLogError).toHaveBeenCalledWith(
        'Failed to install default interceptors:',
        expect.any(Error),
      );
    });

    it('should log installation progress', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'test_rgfx.lua', isDirectory: () => false, isFile: () => true },
      ]);

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockCopyFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultInterceptors();

      expect(mockLogInfo).toHaveBeenCalledWith(
        expect.stringContaining('Copying default interceptors from'),
      );
      expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('Installing to'));
      expect(mockLogInfo).toHaveBeenCalledWith('Default interceptors installation complete');
    });

    it('should log each installed file', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'pacman_rgfx.lua', isDirectory: () => false, isFile: () => true },
      ]);

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockCopyFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultInterceptors();

      expect(mockLogInfo).toHaveBeenCalledWith(
        expect.stringContaining('Installed default interceptor'),
      );
    });
  });

  describe('getBundledInterceptorsDir (via installation)', () => {
    it('should use app path for development mode', async () => {
      mockReaddir.mockResolvedValue([]);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultInterceptors();

      expect(mockLogInfo).toHaveBeenCalledWith(
        expect.stringContaining(path.join('app', 'assets', 'interceptors')),
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

      await installDefaultInterceptors();

      expect(mockLogInfo).toHaveBeenCalledWith(
        expect.stringContaining(path.join('resources', 'interceptors')),
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
