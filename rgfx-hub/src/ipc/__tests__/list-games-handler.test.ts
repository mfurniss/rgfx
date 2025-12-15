/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { registerListGamesHandler } from '@/ipc/list-games-handler';
import * as fs from 'fs';
import type { GameInfo } from '@/types';

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

describe('registerListGamesHandler', () => {
  let registeredHandler: (_event: unknown, romsDirectory?: string) => GameInfo[];

  beforeEach(async () => {
    vi.clearAllMocks();

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (_channel: string, handler: (_event: unknown, romsDirectory?: string) => GameInfo[]) => {
        registeredHandler = handler;
      },
    );

    registerListGamesHandler();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('handler registration', () => {
    it('should register handler for games:list channel', async () => {
      const { ipcMain } = await import('electron');
      expect(ipcMain.handle).toHaveBeenCalledWith('games:list', expect.any(Function));
    });
  });

  describe('rom_map.lua parsing', () => {
    it('should parse standard entries: key = "value"', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.lua')) {
          return true;
        }

        if (pathStr.includes('interceptors')) {
          return true;
        }
        return false;
      });

      vi.mocked(fs.readFileSync).mockReturnValue(`
        pacman = "pacman_rgfx"
        galaga = "galaga_rgfx"
      `);

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr.includes('interceptors/games')) {
          return ['pacman_rgfx.lua', 'galaga_rgfx.lua'];
        }
        return [];
      });

      const result = registeredHandler({});

      expect(result).toHaveLength(2);
      expect(result.map((g) => g.interceptorName)).toContain('pacman_rgfx.lua');
      expect(result.map((g) => g.interceptorName)).toContain('galaga_rgfx.lua');
    });

    it('should parse bracket entries: ["key with spaces"] = "value"', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.lua')) {
          return true;
        }

        if (pathStr.includes('interceptors')) {
          return true;
        }
        return false;
      });

      vi.mocked(fs.readFileSync).mockReturnValue(`
        ["donkey kong"] = "dkong_rgfx"
      `);

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr.includes('interceptors/games')) {
          return ['dkong_rgfx.lua'];
        }
        return [];
      });

      const result = registeredHandler({});

      expect(result).toHaveLength(1);
      expect(result[0].interceptorName).toBe('dkong_rgfx.lua');
    });

    it('should return empty map for missing rom_map file', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.lua')) {
          return false;
        }

        if (pathStr.includes('interceptors')) {
          return true;
        }
        return false;
      });

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr.includes('interceptors/games')) {
          return ['test_rgfx.lua'];
        }
        return [];
      });

      const result = registeredHandler({});

      // Should still work, just without alias resolution
      expect(result).toHaveLength(1);
    });

    it('should handle malformed entries gracefully', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.lua')) {
          return true;
        }

        if (pathStr.includes('interceptors')) {
          return true;
        }
        return false;
      });

      vi.mocked(fs.readFileSync).mockReturnValue(`
        -- This is a comment
        invalid entry without equals
        pacman = "pacman_rgfx"
        = "missing key"
        "missing value" =
      `);

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr.includes('interceptors/games')) {
          return ['pacman_rgfx.lua'];
        }
        return [];
      });

      // Should not throw
      const result = registeredHandler({});
      expect(result).toHaveLength(1);
    });
  });

  describe('ROM base name extraction', () => {
    it('should strip known extensions (.zip, .nes, .smc, .sfc, .bin, .rom)', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.lua')) {
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

        if (pathStr.includes('interceptors/games')) {
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

        if (pathStr.includes('rom_map.lua')) {
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

        if (pathStr.includes('rom_map.lua')) {
          return false;
        }

        if (pathStr === '/roms') {
          return true;
        }

        if (pathStr.includes('interceptors/games')) {
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

        if (pathStr.includes('interceptors/games')) {
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

        if (pathStr.includes('rom_map.lua')) {
          return false;
        }

        if (pathStr.includes('interceptors/games')) {
          return true;
        }
        return false;
      });

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr.includes('interceptors/games')) {
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

        if (pathStr.includes('rom_map.lua')) {
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

        if (pathStr.includes('interceptors/games')) {
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

        if (pathStr.includes('rom_map.lua')) {
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

        if (pathStr.includes('rom_map.lua')) {
          return true;
        }

        if (pathStr === '/roms') {
          return true;
        }

        if (pathStr.includes('dkong_rgfx.lua')) {
          return true;
        }

        if (pathStr.includes('interceptors')) {
          return true;
        }
        return false;
      });

      vi.mocked(fs.readFileSync).mockReturnValue(`
        dkong = "dkong_rgfx"
      `);

      (fs.readdirSync as Mock).mockImplementation((p: fs.PathLike) => {
        const pathStr = String(p);

        if (pathStr === '/roms') {
          return ['dkong.zip'];
        }

        if (pathStr.includes('interceptors/games')) {
          return [];
        }
        return [];
      });

      const result = registeredHandler({}, '/roms');

      expect(result).toHaveLength(1);
      expect(result[0].romName).toBe('dkong.zip');
      expect(result[0].interceptorPath).toContain('dkong_rgfx.lua');
    });

    it('should include transformer info when transformer exists', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);

        if (pathStr.includes('rom_map.lua')) {
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

        if (pathStr.includes('interceptors/games')) {
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

        if (pathStr.includes('rom_map.lua')) {
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

        if (pathStr.includes('interceptors/games')) {
          return [];
        }
        return [];
      });

      registeredHandler({}, '~/roms');

      expect(mockExpandPath).toHaveBeenCalledWith('~/roms');
    });
  });
});
