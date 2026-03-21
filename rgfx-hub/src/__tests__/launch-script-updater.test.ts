import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateLaunchScriptRomPath } from '@/launch-script-updater';

const {
  mockReadFile,
  mockWriteFile,
  mockLogInfo,
  mockLogWarn,
} = vi.hoisted(() => ({
  mockReadFile: vi.fn(),
  mockWriteFile: vi.fn(),
  mockLogInfo: vi.fn(),
  mockLogWarn: vi.fn(),
}));

vi.mock('electron-log/main', () => ({
  default: {
    info: mockLogInfo,
    warn: mockLogWarn,
    error: vi.fn(),
  },
}));

vi.mock('node:fs', () => ({
  default: {
    promises: {
      readFile: mockReadFile,
      writeFile: mockWriteFile,
    },
  },
  promises: {
    readFile: mockReadFile,
    writeFile: mockWriteFile,
  },
}));

vi.mock('@/config/paths', () => ({
  CONFIG_DIRECTORY: '/mock/user/.rgfx',
}));

describe('launch-script-updater', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateLaunchScriptRomPath', () => {
    it('should update only the ROM_PATH line on macOS', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

      const existingScript = [
        '#!/bin/bash',
        'RGFX_LUA_PATH="/custom/path/to/rgfx.lua"',
        'ROM_PATH="/old/roms/path"',
        'MAME_PATH="/usr/local/bin/mame"',
        '',
        '# User added this custom comment',
        'echo "Custom user script logic"',
      ].join('\n');

      mockReadFile.mockResolvedValue(existingScript);
      mockWriteFile.mockResolvedValue(undefined);

      await updateLaunchScriptRomPath('/new/roms/path');

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;

      const expectedContent = [
        '#!/bin/bash',
        'RGFX_LUA_PATH="/custom/path/to/rgfx.lua"',
        'ROM_PATH="/new/roms/path"',
        'MAME_PATH="/usr/local/bin/mame"',
        '',
        '# User added this custom comment',
        'echo "Custom user script logic"',
      ].join('\n');

      expect(writtenContent).toBe(expectedContent);

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });

    it('should update only the ROM_PATH line on Windows', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

      const existingScript = [
        '@echo off',
        'set "RGFX_LUA_PATH=C:\\Program Files\\RGFX Hub\\resources\\mame\\rgfx.lua"',
        'set "ROM_PATH=C:\\Users\\Brad\\mame-roms"',
        'set "MAME_PATH=C:\\mame\\mame.exe"',
        '',
        ':: User added this custom comment',
        'echo Custom user script logic',
      ].join('\r\n');

      mockReadFile.mockResolvedValue(existingScript);
      mockWriteFile.mockResolvedValue(undefined);

      await updateLaunchScriptRomPath('D:\\Games\\ROMs');

      const writtenContent = mockWriteFile.mock.calls[0][1] as string;

      const expectedContent = [
        '@echo off',
        'set "RGFX_LUA_PATH=C:\\Program Files\\RGFX Hub\\resources\\mame\\rgfx.lua"',
        'set "ROM_PATH=D:\\Games\\ROMs"',
        'set "MAME_PATH=C:\\mame\\mame.exe"',
        '',
        ':: User added this custom comment',
        'echo Custom user script logic',
      ].join('\r\n');

      expect(writtenContent).toBe(expectedContent);

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });

    it('should warn and not write if ROM_PATH line is not found', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

      mockReadFile.mockResolvedValue('#!/bin/bash\necho "no rom path here"');

      await updateLaunchScriptRomPath('/new/path');

      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(mockLogWarn).toHaveBeenCalledWith(
        expect.stringContaining('ROM_PATH line not found'),
      );

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });

    it('should skip unsupported platforms', async () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });

      await updateLaunchScriptRomPath('/new/path');

      expect(mockReadFile).not.toHaveBeenCalled();
      expect(mockWriteFile).not.toHaveBeenCalled();

      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
    });
  });
});
