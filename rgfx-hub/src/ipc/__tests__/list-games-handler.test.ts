import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import path from 'path';
import { registerListGamesHandler } from '@/ipc/list-games-handler';
import * as fs from 'fs';
import type { GameInfo } from '@/types';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

// Use vi.hoisted to create mock functions that are available during vi.mock hoisting
const { mockLogInfo, mockLogError, mockExpandPath } = vi.hoisted(() => ({
  mockLogInfo: vi.fn(),
  mockLogError: vi.fn(),
  mockExpandPath: vi.fn((p: string) => p.replace('~', '/home/user')),
}));

vi.mock('electron-log/main', () => ({
  default: {
    info: mockLogInfo,
    error: mockLogError,
  },
}));

vi.mock('fs');
vi.mock('@/config/paths', () => ({
  CONFIG_DIRECTORY: '/mock/config',
}));

vi.mock('@/utils/expand-path', () => ({
  expandPath: mockExpandPath,
}));

// Cross-platform path fragment for mock checks
const INTERCEPTORS_GAMES = path.join('interceptors', 'games');

describe('registerListGamesHandler', () => {
  let registeredHandler: (_event: unknown, romsDirectory?: string) => GameInfo[];
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    ipc = await setupIpcHandlerCapture();

    registerListGamesHandler();

    registeredHandler = ipc.getHandler('games:list') as typeof registeredHandler;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handler registration', () => {
    it('should register handler for games:list channel', () => {
      ipc.assertChannel('games:list');
    });
  });

  describe('rom_map.json parsing', () => {
    it('should parse variant entries from JSON', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.json')) {
          return true;
        }

        if (pathStr.includes('interceptors')) {
          return true;
        }
        return false;
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ pacman: ['mspacman'], galaga: ['galaga3'] }),
      );

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr.includes(INTERCEPTORS_GAMES)) {
          return ['pacman_rgfx.lua', 'galaga_rgfx.lua'];
        }
        return [];
      });

      const result = registeredHandler({});

      expect(result).toHaveLength(2);
      expect(result.map((g) => g.interceptorName)).toContain('pacman_rgfx.lua');
      expect(result.map((g) => g.interceptorName)).toContain('galaga_rgfx.lua');
    });

    it('should parse variant entries and resolve ROM to prefixed interceptor', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.json')) {
          return true;
        }

        if (pathStr === '/roms') {
          return true;
        }

        if (pathStr.includes('nes_smb_rgfx.lua')) {
          return true;
        }

        // nes_smb.js doesn't exist, but smb.js does (ROM-derived fallback)
        if (pathStr.endsWith('nes_smb.js')) {
          return false;
        }

        if (pathStr.endsWith('smb.js')) {
          return true;
        }

        if (pathStr.includes('interceptors')) {
          return true;
        }
        return false;
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ nes_smb: ['smb', 'smw'] }),
      );

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr === '/roms') {
          return ['smb.nes'];
        }

        if (pathStr.includes(INTERCEPTORS_GAMES)) {
          return [];
        }
        return [];
      });

      const result = registeredHandler({}, '/roms');

      expect(result).toHaveLength(1);
      expect(result[0].romName).toBe('smb.nes');
      expect(result[0].interceptorName).toBe('nes_smb_rgfx.lua');
      expect(result[0].transformerName).toBe('smb.js');
    });

    it('should return empty map for missing rom_map file', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.json')) {
          return false;
        }

        if (pathStr.includes('interceptors')) {
          return true;
        }
        return false;
      });

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr.includes(INTERCEPTORS_GAMES)) {
          return ['test_rgfx.lua'];
        }
        return [];
      });

      const result = registeredHandler({});

      // Should still work, just without alias resolution
      expect(result).toHaveLength(1);
    });

    it('should handle malformed JSON gracefully and log error', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.json')) {
          return true;
        }

        if (pathStr.includes('interceptors')) {
          return true;
        }
        return false;
      });

      vi.mocked(fs.readFileSync).mockReturnValue('not valid json {{{');

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr.includes(INTERCEPTORS_GAMES)) {
          return ['pacman_rgfx.lua'];
        }
        return [];
      });

      // Should not throw, but should log the parse error
      const result = registeredHandler({});
      expect(result).toHaveLength(1);
      expect(mockLogError).toHaveBeenCalledWith(expect.stringContaining('Failed to parse rom_map.json'));
    });
  });

  describe('ROM base name extraction', () => {
    it('should strip known extensions (.zip, .nes, .smc, .sfc, .bin, .rom)', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.json')) {
          return false;
        }

        if (pathStr === '/roms') {
          return true;
        }

        if (pathStr.includes('interceptors')) {
          return true;
        }
        return false;
      });

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr === '/roms') {
          return [
            'pacman.zip',
            'mario.nes',
            'zelda.smc',
            'metroid.sfc',
            'sonic.bin',
            'tetris.rom',
          ];
        }

        if (pathStr.includes(INTERCEPTORS_GAMES)) {
          return [
            'pacman_rgfx.lua',
            'mario_rgfx.lua',
            'zelda_rgfx.lua',
            'metroid_rgfx.lua',
            'sonic_rgfx.lua',
            'tetris_rgfx.lua',
          ];
        }
        return [];
      });

      const result = registeredHandler({}, '/roms');

      // Each ROM should have matched its interceptor based on base name
      const matchedRoms = result.filter((g) => g.romName && g.interceptorName);
      expect(matchedRoms).toHaveLength(6);
    });

    it('should preserve filenames with unknown extensions', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.json')) {
          return false;
        }

        if (pathStr === '/roms') {
          return true;
        }

        if (pathStr.includes('interceptors')) {
          return false;
        }
        return false;
      });

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr === '/roms') {
          return ['game.unknown'];
        }
        return [];
      });

      // Unknown extension files are filtered out since they're not in ROM_EXTENSIONS
      const result = registeredHandler({}, '/roms');
      expect(result).toHaveLength(0);
    });
  });

  describe('games listing', () => {
    it('should return games from ROMs directory', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.json')) {
          return false;
        }

        if (pathStr === '/roms') {
          return true;
        }

        if (pathStr.includes(INTERCEPTORS_GAMES)) {
          return true;
        }

        if (pathStr.includes('pacman_rgfx.lua')) {
          return true;
        }
        return false;
      });

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr === '/roms') {
          return ['pacman.zip'];
        }

        if (pathStr.includes(INTERCEPTORS_GAMES)) {
          return [];
        }
        return [];
      });

      const result = registeredHandler({}, '/roms');

      expect(result).toHaveLength(1);
      expect(result[0].romName).toBe('pacman.zip');
      expect(result[0].interceptorPath).toContain('pacman_rgfx.lua');
    });

    it('should return games from interceptors directory when no ROM exists', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.json')) {
          return false;
        }

        if (pathStr.includes(INTERCEPTORS_GAMES)) {
          return true;
        }
        return false;
      });

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr.includes(INTERCEPTORS_GAMES)) {
          return ['orphan_rgfx.lua'];
        }
        return [];
      });

      const result = registeredHandler({});

      expect(result).toHaveLength(1);
      expect(result[0].romName).toBeNull();
      expect(result[0].interceptorName).toBe('orphan_rgfx.lua');
    });

    it('should handle missing ROMs directory gracefully', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.json')) {
          return false;
        }

        if (pathStr === '/nonexistent') {
          return false;
        }

        if (pathStr.includes('interceptors')) {
          return true;
        }
        return false;
      });

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr.includes(INTERCEPTORS_GAMES)) {
          return [];
        }
        return [];
      });

      const result = registeredHandler({}, '/nonexistent');

      expect(result).toHaveLength(0);
    });

    it('should handle missing interceptors directory gracefully', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.json')) {
          return false;
        }

        if (pathStr.includes('interceptors')) {
          return false;
        }
        return false;
      });

      (fs.readdirSync as Mock).mockImplementation(() => {
        return [];
      });

      const result = registeredHandler({});

      expect(result).toHaveLength(0);
    });

    it('should resolve ROM to interceptor via rom_map alias', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.json')) {
          return true;
        }

        if (pathStr === '/roms') {
          return true;
        }

        if (pathStr.includes('pacman_rgfx.lua')) {
          return true;
        }

        if (pathStr.includes('pacman.js')) {
          return true;
        }

        if (pathStr.includes('interceptors')) {
          return true;
        }
        return false;
      });

      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({ pacman: ['mspacman'] }),
      );

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr === '/roms') {
          return ['mspacman.zip'];
        }

        if (pathStr.includes(INTERCEPTORS_GAMES)) {
          return [];
        }
        return [];
      });

      const result = registeredHandler({}, '/roms');

      expect(result).toHaveLength(1);
      expect(result[0].romName).toBe('mspacman.zip');
      expect(result[0].interceptorPath).toContain('pacman_rgfx.lua');
      expect(result[0].transformerName).toBe('pacman.js');
    });

    it('should include transformer info when transformer exists', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.json')) {
          return false;
        }

        if (pathStr === '/roms') {
          return true;
        }

        if (pathStr.includes('pacman_rgfx.lua')) {
          return true;
        }

        if (pathStr.includes('pacman.js')) {
          return true;
        }

        if (pathStr.includes('interceptors')) {
          return true;
        }

        if (pathStr.includes('transformers')) {
          return true;
        }
        return false;
      });

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr === '/roms') {
          return ['pacman.zip'];
        }

        if (pathStr.includes(INTERCEPTORS_GAMES)) {
          return [];
        }
        return [];
      });

      const result = registeredHandler({}, '/roms');

      expect(result).toHaveLength(1);
      expect(result[0].transformerPath).toContain('pacman.js');
      expect(result[0].transformerName).toBe('pacman.js');
    });
  });

  describe('error handling', () => {
    it('should return empty array on error and log', () => {
      vi.mocked(fs.existsSync).mockImplementation(() => {
        throw new Error('Filesystem error');
      });

      const result = registeredHandler({});

      expect(result).toEqual([]);
      expect(mockLogError).toHaveBeenCalledWith('Failed to list games:', expect.any(Error));
    });
  });

  describe('path expansion', () => {
    it('should expand tilde in ROMs directory path', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr === '/home/user/roms') {
          return true;
        }

        if (pathStr.includes('rom_map.json')) {
          return false;
        }

        if (pathStr.includes('interceptors')) {
          return true;
        }
        return false;
      });

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr === '/home/user/roms') {
          return ['game.zip'];
        }

        if (pathStr.includes(INTERCEPTORS_GAMES)) {
          return [];
        }
        return [];
      });

      registeredHandler({}, '~/roms');

      expect(mockExpandPath).toHaveBeenCalledWith('~/roms');
    });
  });
});
