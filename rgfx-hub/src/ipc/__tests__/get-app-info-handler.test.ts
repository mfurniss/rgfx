import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registerGetAppInfoHandler } from '@/ipc/get-app-info-handler';
import type { AppInfo } from '@/types';
import { np } from '@/__tests__/test-utils';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';
import pkg from '../../../package.json';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  app: {
    isPackaged: false,
    getAppPath: vi.fn(() => '/app/path'),
  },
}));

describe('registerGetAppInfoHandler', () => {
  let registeredHandler: () => AppInfo;
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;
  const originalEnv = process.env;

  beforeEach(async () => {
    vi.clearAllMocks();

    process.env = { ...originalEnv, HOME: '/home/testuser' };

    ipc = await setupIpcHandlerCapture();

    registerGetAppInfoHandler();

    registeredHandler = ipc.getHandler('app:get-info') as () => AppInfo;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('handler registration', () => {
    it('should register handler for app:get-info channel', () => {
      ipc.assertChannel('app:get-info');
    });
  });

  describe('version', () => {
    it('should return version from package.json', () => {
      const result = registeredHandler();
      expect(result.version).toBe(pkg.version);
    });
  });

  describe('license path', () => {
    it('should return development license path when not packaged', () => {
      const result = registeredHandler();
      expect(np(result.licensePath)).toBe('/app/LICENSE');
    });

    it('should return packaged license path when app is packaged', async () => {
      const { app } = await import('electron');
      (app as { isPackaged: boolean }).isPackaged = true;

      const originalResourcesPath = process.resourcesPath;
      Object.defineProperty(process, 'resourcesPath', {
        value: '/resources',
        writable: true,
        configurable: true,
      });

      const result = registeredHandler();
      expect(np(result.licensePath)).toBe('/resources/LICENSE');

      Object.defineProperty(process, 'resourcesPath', {
        value: originalResourcesPath,
        writable: true,
        configurable: true,
      });
      (app as { isPackaged: boolean }).isPackaged = false;
    });
  });

  describe('default directories', () => {
    it('should return default RGFX config directory based on HOME', () => {
      const result = registeredHandler();
      expect(result.defaultRgfxConfigDir).toBe('/home/testuser/.rgfx');
    });

    it('should return default MAME ROMs directory based on HOME', () => {
      const result = registeredHandler();
      expect(result.defaultMameRomsDir).toBe('/home/testuser/mame-roms');
    });

    it('should use USERPROFILE when HOME is not set', () => {
      process.env = { USERPROFILE: 'C:\\Users\\testuser' };

      const result = registeredHandler();
      expect(result.defaultRgfxConfigDir).toBe('C:\\Users\\testuser/.rgfx');
      expect(result.defaultMameRomsDir).toBe('C:\\Users\\testuser/mame-roms');
    });

    it('should return empty-based paths when no home directory is set', () => {
      process.env = {};

      const result = registeredHandler();
      expect(result.defaultRgfxConfigDir).toBe('/.rgfx');
      expect(result.defaultMameRomsDir).toBe('/mame-roms');
    });
  });

  describe('return type', () => {
    it('should return all AppInfo fields', () => {
      const result = registeredHandler();

      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('licensePath');
      expect(result).toHaveProperty('defaultRgfxConfigDir');
      expect(result).toHaveProperty('defaultMameRomsDir');
    });
  });
});
