import path from 'path';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installDefaultLedHardware } from '@/led-hardware-installer';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: vi.fn(() => '/app'),
  },
}));

const {
  mockMkdir,
  mockReaddir,
  mockAccess,
  mockCopyFile,
  mockLogInfo,
  mockLogDebug,
  mockLogError,
} = vi.hoisted(() => ({
  mockMkdir: vi.fn(),
  mockReaddir: vi.fn(),
  mockAccess: vi.fn(),
  mockCopyFile: vi.fn(),
  mockLogInfo: vi.fn(),
  mockLogDebug: vi.fn(),
  mockLogError: vi.fn(),
}));

vi.mock('electron-log/main', () => ({
  default: {
    info: mockLogInfo,
    debug: mockLogDebug,
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
  LED_HARDWARE_DIRECTORY: '/mock/user/.rgfx/led-hardware',
}));

describe('led-hardware-installer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('installDefaultLedHardware', () => {
    it('should copy JSON files to empty directory', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'matrix-8x8.json', isDirectory: () => false, isFile: () => true },
      ]);

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockCopyFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultLedHardware();

      expect(mockMkdir).toHaveBeenCalledWith('/mock/user/.rgfx/led-hardware', { recursive: true });
      expect(mockCopyFile).toHaveBeenCalledWith(
        path.join('/app', 'assets', 'led-hardware', 'matrix-8x8.json'),
        path.join('/mock/user/.rgfx/led-hardware', 'matrix-8x8.json'),
      );
    });

    it('should skip existing files to preserve user customizations', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'custom-strip.json', isDirectory: () => false, isFile: () => true },
      ]);

      mockAccess.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultLedHardware();

      expect(mockCopyFile).not.toHaveBeenCalled();
      expect(mockLogDebug).toHaveBeenCalledWith(
        'LED hardware already exists, skipping: custom-strip.json',
      );
    });

    it('should only copy .json files', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'hardware.json', isDirectory: () => false, isFile: () => true },
        { name: 'readme.md', isDirectory: () => false, isFile: () => true },
        { name: 'backup.json.bak', isDirectory: () => false, isFile: () => true },
      ]);

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockCopyFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultLedHardware();

      expect(mockCopyFile).toHaveBeenCalledTimes(1);
      expect(mockCopyFile).toHaveBeenCalledWith(
        expect.stringContaining('hardware.json'),
        expect.stringContaining('hardware.json'),
      );
    });

    it('should skip directories', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'subdir', isDirectory: () => true, isFile: () => false },
        { name: 'hardware.json', isDirectory: () => false, isFile: () => true },
      ]);

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockCopyFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultLedHardware();

      expect(mockCopyFile).toHaveBeenCalledTimes(1);
    });

    it('should handle missing bundled directory', async () => {
      const error = new Error('ENOENT: no such file or directory');
      (error as NodeJS.ErrnoException).code = 'ENOENT';

      mockMkdir.mockResolvedValue(undefined);
      mockReaddir.mockRejectedValue(error);

      await expect(installDefaultLedHardware()).rejects.toThrow();

      expect(mockLogError).toHaveBeenCalledWith(
        'Failed to install LED hardware:',
        expect.any(Error),
      );
    });

    it('should log installation progress', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'strip.json', isDirectory: () => false, isFile: () => true },
      ]);

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockCopyFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultLedHardware();

      expect(mockLogInfo).toHaveBeenCalledWith(
        expect.stringContaining('Copying default LED hardware from'),
      );
      expect(mockLogInfo).toHaveBeenCalledWith(expect.stringContaining('Installing to'));
      expect(mockLogInfo).toHaveBeenCalledWith('Installed LED hardware: strip.json');
      expect(mockLogInfo).toHaveBeenCalledWith('LED hardware installation complete');
    });

    it('should copy multiple files', async () => {
      mockReaddir.mockResolvedValue([
        { name: 'matrix-8x8.json', isDirectory: () => false, isFile: () => true },
        { name: 'strip-144.json', isDirectory: () => false, isFile: () => true },
        { name: 'strip-60.json', isDirectory: () => false, isFile: () => true },
      ]);

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockCopyFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultLedHardware();

      expect(mockCopyFile).toHaveBeenCalledTimes(3);
    });
  });

  describe('getBundledLedHardwareDir (via installation)', () => {
    it('should use app path for development mode', async () => {
      mockReaddir.mockResolvedValue([]);
      mockMkdir.mockResolvedValue(undefined);

      await installDefaultLedHardware();

      expect(mockLogInfo).toHaveBeenCalledWith(
        expect.stringContaining(path.join('app', 'assets', 'led-hardware')),
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

      await installDefaultLedHardware();

      expect(mockLogInfo).toHaveBeenCalledWith(
        expect.stringContaining(path.join('resources', 'assets', 'led-hardware')),
      );

      Object.defineProperty(process, 'resourcesPath', {
        value: originalResourcesPath,
        writable: true,
        configurable: true,
      });
      (app as { isPackaged: boolean }).isPackaged = false;
    });
  });
});
