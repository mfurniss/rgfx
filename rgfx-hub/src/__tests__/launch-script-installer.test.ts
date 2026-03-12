import path from 'path';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { installLaunchScript } from '@/launch-script-installer';

vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getAppPath: vi.fn(() => '/app'),
  },
}));

const {
  mockMkdir,
  mockAccess,
  mockReadFile,
  mockWriteFile,
  mockChmod,
  mockLogInfo,
} = vi.hoisted(() => ({
  mockMkdir: vi.fn(),
  mockAccess: vi.fn(),
  mockReadFile: vi.fn(),
  mockWriteFile: vi.fn(),
  mockChmod: vi.fn(),
  mockLogInfo: vi.fn(),
}));

vi.mock('electron-log/main', () => ({
  default: {
    info: mockLogInfo,
    error: vi.fn(),
  },
}));

vi.mock('node:fs', () => ({
  default: {
    promises: {
      mkdir: mockMkdir,
      access: mockAccess,
      readFile: mockReadFile,
      writeFile: mockWriteFile,
      chmod: mockChmod,
    },
  },
  promises: {
    mkdir: mockMkdir,
    access: mockAccess,
    readFile: mockReadFile,
    writeFile: mockWriteFile,
    chmod: mockChmod,
  },
}));

vi.mock('@/config/paths', () => ({
  CONFIG_DIRECTORY: '/mock/user/.rgfx',
}));

const TEMPLATE_CONTENT = [
  '#!/bin/bash',
  'RGFX_LUA_PATH="{{RGFX_LUA_PATH}}"',
  'ROM_PATH="{{ROM_PATH}}"',
  'MAME_PATH=""',
].join('\n');

describe('launch-script-installer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('installLaunchScript', () => {
    it('should select .sh script on macOS', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockReadFile.mockResolvedValue(TEMPLATE_CONTENT);
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);
      mockChmod.mockResolvedValue(undefined);

      await installLaunchScript();

      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining('launch-mame.sh'),
        'utf-8',
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('launch-mame.sh'),
        expect.any(String),
        'utf-8',
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });

    it('should select .bat script on Windows', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockReadFile.mockResolvedValue(TEMPLATE_CONTENT);
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installLaunchScript();

      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining('launch-mame.bat'),
        'utf-8',
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('launch-mame.bat'),
        expect.any(String),
        'utf-8',
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });

    it('should replace {{RGFX_LUA_PATH}} and {{ROM_PATH}} placeholders', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockReadFile.mockResolvedValue(TEMPLATE_CONTENT);
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);
      mockChmod.mockResolvedValue(undefined);

      await installLaunchScript();

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;

      // Placeholders should be replaced
      expect(writtenContent).not.toContain('{{RGFX_LUA_PATH}}');
      expect(writtenContent).not.toContain('{{ROM_PATH}}');

      // Should contain resolved paths
      expect(writtenContent).toContain('rgfx.lua');
      expect(writtenContent).toContain('mame-roms');

      // MAME_PATH should remain empty (not a placeholder)
      expect(writtenContent).toContain('MAME_PATH=""');

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });

    it('should not overwrite existing file', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

      // File already exists
      mockAccess.mockResolvedValue(undefined);

      await installLaunchScript();

      expect(mockReadFile).not.toHaveBeenCalled();
      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(mockLogInfo).toHaveBeenCalledWith(
        expect.stringContaining('already exists, skipping'),
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });

    it('should set executable permission on macOS', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockReadFile.mockResolvedValue(TEMPLATE_CONTENT);
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);
      mockChmod.mockResolvedValue(undefined);

      await installLaunchScript();

      expect(mockChmod).toHaveBeenCalledWith(
        expect.stringContaining('launch-mame.sh'),
        0o755,
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });

    it('should not set executable permission on Windows', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockReadFile.mockResolvedValue(TEMPLATE_CONTENT);
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);

      await installLaunchScript();

      expect(mockChmod).not.toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });

    it('should skip unsupported platforms', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });

      await installLaunchScript();

      expect(mockReadFile).not.toHaveBeenCalled();
      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(mockLogInfo).toHaveBeenCalledWith(
        expect.stringContaining('not available for platform'),
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });

    it('should use dev path when not packaged', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockReadFile.mockResolvedValue(TEMPLATE_CONTENT);
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);
      mockChmod.mockResolvedValue(undefined);

      await installLaunchScript();

      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining(path.join('app', 'assets', 'scripts', 'launch-mame.sh')),
        'utf-8',
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });

    it('should use resourcesPath when packaged', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

      const { app } = await import('electron');
      (app as { isPackaged: boolean }).isPackaged = true;

      const originalResourcesPath = process.resourcesPath;
      Object.defineProperty(process, 'resourcesPath', {
        value: '/resources',
        writable: true,
        configurable: true,
      });

      mockAccess.mockRejectedValue(new Error('ENOENT'));
      mockReadFile.mockResolvedValue(TEMPLATE_CONTENT);
      mockWriteFile.mockResolvedValue(undefined);
      mockMkdir.mockResolvedValue(undefined);
      mockChmod.mockResolvedValue(undefined);

      await installLaunchScript();

      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining(path.join('resources', 'scripts', 'launch-mame.sh')),
        'utf-8',
      );

      // Cleanup
      Object.defineProperty(process, 'resourcesPath', {
        value: originalResourcesPath,
        writable: true,
        configurable: true,
      });
      (app as { isPackaged: boolean }).isPackaged = false;
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });
  });
});
