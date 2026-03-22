import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateLaunchScriptRomPath, updateLaunchScriptMamePath, updateLaunchScriptVariable } from '@/launch-script-updater';

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

const MACOS_SCRIPT = [
  '#!/bin/bash',
  'RGFX_LUA_PATH="/custom/path/to/rgfx.lua"',
  'ROM_PATH="/old/roms/path"',
  'MAME_PATH=""',
  '',
  '# User added this custom comment',
  'echo "Custom user script logic"',
].join('\n');

const WINDOWS_SCRIPT = [
  '@echo off',
  'set "RGFX_LUA_PATH=C:\\Program Files\\RGFX Hub\\resources\\mame\\rgfx.lua"',
  'set "ROM_PATH=C:\\Users\\Brad\\mame-roms"',
  'set "MAME_PATH="',
  '',
  ':: User added this custom comment',
  'echo Custom user script logic',
].join('\r\n');

function withPlatform(platform: string, fn: () => Promise<void>) {
  return async () => {
    const original = process.platform;
    Object.defineProperty(process, 'platform', { value: platform, configurable: true });

    try {
      await fn();
    } finally {
      Object.defineProperty(process, 'platform', { value: original, configurable: true });
    }
  };
}

describe('launch-script-updater', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe('updateLaunchScriptVariable (generic)', () => {
    it('should update a named variable on macOS', withPlatform('darwin', async () => {
      mockReadFile.mockResolvedValue(MACOS_SCRIPT);

      await updateLaunchScriptVariable('ROM_PATH', '/new/roms');

      const written = mockWriteFile.mock.calls[0][1] as string;
      expect(written).toContain('ROM_PATH="/new/roms"');
      expect(written).toContain('MAME_PATH=""');
    }));

    it('should update a named variable on Windows', withPlatform('win32', async () => {
      mockReadFile.mockResolvedValue(WINDOWS_SCRIPT);

      await updateLaunchScriptVariable('MAME_PATH', 'F:\\Mame\\mame.exe');

      const written = mockWriteFile.mock.calls[0][1] as string;
      expect(written).toContain('set "MAME_PATH=F:\\Mame\\mame.exe"');
      expect(written).toContain('set "ROM_PATH=C:\\Users\\Brad\\mame-roms"');
    }));

    it('should warn when variable line is not found', withPlatform('darwin', async () => {
      mockReadFile.mockResolvedValue('#!/bin/bash\necho "no vars"');

      await updateLaunchScriptVariable('ROM_PATH', '/new/path');

      expect(mockWriteFile).not.toHaveBeenCalled();
      expect(mockLogWarn).toHaveBeenCalledWith(
        expect.stringContaining('ROM_PATH line not found'),
      );
    }));

    it('should skip unsupported platforms', withPlatform('linux', async () => {
      await updateLaunchScriptVariable('ROM_PATH', '/new/path');

      expect(mockReadFile).not.toHaveBeenCalled();
      expect(mockWriteFile).not.toHaveBeenCalled();
    }));
  });

  describe('updateLaunchScriptRomPath', () => {
    it('should update only ROM_PATH on macOS', withPlatform('darwin', async () => {
      mockReadFile.mockResolvedValue(MACOS_SCRIPT);

      await updateLaunchScriptRomPath('/new/roms/path');

      const written = mockWriteFile.mock.calls[0][1] as string;
      expect(written).toContain('ROM_PATH="/new/roms/path"');
      expect(written).toContain('MAME_PATH=""');
      expect(written).toContain('RGFX_LUA_PATH="/custom/path/to/rgfx.lua"');
    }));

    it('should update only ROM_PATH on Windows', withPlatform('win32', async () => {
      mockReadFile.mockResolvedValue(WINDOWS_SCRIPT);

      await updateLaunchScriptRomPath('D:\\Games\\ROMs');

      const written = mockWriteFile.mock.calls[0][1] as string;
      expect(written).toContain('set "ROM_PATH=D:\\Games\\ROMs"');
      expect(written).toContain('set "MAME_PATH="');
    }));

    it('should handle paths with spaces on Windows', withPlatform('win32', async () => {
      mockReadFile.mockResolvedValue(WINDOWS_SCRIPT);

      await updateLaunchScriptRomPath('D:\\My Games\\MAME ROMs');

      const written = mockWriteFile.mock.calls[0][1] as string;
      expect(written).toContain('set "ROM_PATH=D:\\My Games\\MAME ROMs"');

      const match = /^set "ROM_PATH=(.*)"$/m.exec(written);
      expect(match?.[1]).toBe('D:\\My Games\\MAME ROMs');
    }));

    it('should handle paths with spaces on macOS', withPlatform('darwin', async () => {
      const script = MACOS_SCRIPT.replace(
        'RGFX_LUA_PATH="/custom/path/to/rgfx.lua"',
        'RGFX_LUA_PATH="/Applications/RGFX Hub.app/Contents/Resources/mame/rgfx.lua"',
      );
      mockReadFile.mockResolvedValue(script);

      await updateLaunchScriptRomPath('/Users/brad/My Games/MAME ROMs');

      const written = mockWriteFile.mock.calls[0][1] as string;
      expect(written).toContain('ROM_PATH="/Users/brad/My Games/MAME ROMs"');
      expect(written).toContain('RGFX_LUA_PATH="/Applications/RGFX Hub.app/Contents/Resources/mame/rgfx.lua"');
    }));
  });

  describe('updateLaunchScriptMamePath', () => {
    it('should update only MAME_PATH on macOS', withPlatform('darwin', async () => {
      mockReadFile.mockResolvedValue(MACOS_SCRIPT);

      await updateLaunchScriptMamePath('/opt/homebrew/bin/mame');

      const written = mockWriteFile.mock.calls[0][1] as string;
      expect(written).toContain('MAME_PATH="/opt/homebrew/bin/mame"');
      expect(written).toContain('ROM_PATH="/old/roms/path"');
    }));

    it('should update only MAME_PATH on Windows', withPlatform('win32', async () => {
      mockReadFile.mockResolvedValue(WINDOWS_SCRIPT);

      await updateLaunchScriptMamePath('F:\\Mame\\mame.exe');

      const written = mockWriteFile.mock.calls[0][1] as string;
      expect(written).toContain('set "MAME_PATH=F:\\Mame\\mame.exe"');
      expect(written).toContain('set "ROM_PATH=C:\\Users\\Brad\\mame-roms"');
    }));

    it('should clear MAME_PATH to revert to auto-detect', withPlatform('win32', async () => {
      const script = WINDOWS_SCRIPT.replace(
        'set "MAME_PATH="',
        'set "MAME_PATH=C:\\mame\\mame.exe"',
      );
      mockReadFile.mockResolvedValue(script);

      await updateLaunchScriptMamePath('');

      const written = mockWriteFile.mock.calls[0][1] as string;
      expect(written).toContain('set "MAME_PATH="');
    }));

    it('should handle paths with spaces on Windows', withPlatform('win32', async () => {
      mockReadFile.mockResolvedValue(WINDOWS_SCRIPT);

      await updateLaunchScriptMamePath('C:\\Program Files\\MAME\\mame.exe');

      const written = mockWriteFile.mock.calls[0][1] as string;
      const match = /^set "MAME_PATH=(.*)"$/m.exec(written);
      expect(match?.[1]).toBe('C:\\Program Files\\MAME\\mame.exe');
    }));
  });
});
