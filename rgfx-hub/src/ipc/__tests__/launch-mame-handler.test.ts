import { join } from 'pathe';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { registerLaunchMameHandler, buildMameArgs } from '../launch-mame-handler';
import { SEND_CHANNELS } from '../contract';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('@/config/paths', () => ({
  CONFIG_DIRECTORY: '/mock/.rgfx',
}));

const mockStdout = { on: vi.fn() };
const mockStderr = { on: vi.fn() };
const mockChild = { stdout: mockStdout, stderr: mockStderr, on: vi.fn(), unref: vi.fn() };

vi.mock('child_process', () => {
  const mock = { spawn: vi.fn(() => mockChild) };
  return { ...mock, default: mock };
});

const { mockGetZipInnerExtension } = vi.hoisted(() => ({
  mockGetZipInnerExtension: vi.fn<() => Promise<string | null>>().mockResolvedValue(null),
}));

vi.mock('@/utils/zip-utils', () => ({
  getZipInnerExtension: mockGetZipInnerExtension,
}));

describe('buildMameArgs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetZipInnerExtension.mockResolvedValue(null);
  });

  it('returns rom path directly for arcade ROMs (no extension)', async () => {
    expect(await buildMameArgs('pacman')).toEqual(['pacman']);
  });

  it('returns rom path directly for unknown extensions', async () => {
    expect(await buildMameArgs('/roms/mygame.xyz')).toEqual(['/roms/mygame.xyz']);
  });

  it('maps .nes to nes system', async () => {
    expect(await buildMameArgs('/roms/smb.nes')).toEqual(['nes', '-cart', '/roms/smb.nes']);
  });

  it('maps all SNES extensions to snes system', async () => {
    for (const ext of ['.sfc', '.smc', '.fig', '.swc']) {
      expect(await buildMameArgs(`/roms/game${ext}`)).toEqual(['snes', '-cart', `/roms/game${ext}`]);
    }
  });

  it('maps .gb to gameboy and .gbc to gbcolor', async () => {
    expect(await buildMameArgs('/roms/tetris.gb')).toEqual(['gameboy', '-cart', '/roms/tetris.gb']);
    expect(await buildMameArgs('/roms/zelda.gbc')).toEqual(['gbcolor', '-cart', '/roms/zelda.gbc']);
  });

  it('maps .md and .gen to genesis system', async () => {
    expect(await buildMameArgs('/roms/sonic.md')).toEqual(['genesis', '-cart', '/roms/sonic.md']);
    expect(await buildMameArgs('/roms/sonic.gen')).toEqual(['genesis', '-cart', '/roms/sonic.gen']);
  });

  it('is case-insensitive for extensions', async () => {
    expect(await buildMameArgs('/roms/game.NES')).toEqual(['nes', '-cart', '/roms/game.NES']);
    expect(await buildMameArgs('/roms/game.SFC')).toEqual(['snes', '-cart', '/roms/game.SFC']);
  });

  describe('zip inspection', () => {
    it('passes a .zip directly when inner file has an unknown extension', async () => {
      mockGetZipInnerExtension.mockResolvedValue('.bin');

      expect(await buildMameArgs('/roms/pacman.zip')).toEqual(['/roms/pacman.zip']);
    });

    it('detects NES ROM inside a .zip', async () => {
      mockGetZipInnerExtension.mockResolvedValue('.nes');

      expect(await buildMameArgs('/roms/smb.zip')).toEqual(['nes', '-cart', '/roms/smb.zip']);
    });

    it('detects SNES ROM inside a .zip', async () => {
      mockGetZipInnerExtension.mockResolvedValue('.sfc');

      expect(await buildMameArgs('/roms/zelda.zip')).toEqual(['snes', '-cart', '/roms/zelda.zip']);
    });

    it('passes a .zip directly when zip inspection returns null', async () => {
      mockGetZipInnerExtension.mockResolvedValue(null);

      expect(await buildMameArgs('/roms/broken.zip')).toEqual(['/roms/broken.zip']);
    });
  });
});

describe('registerLaunchMameHandler', () => {
  let handler: (event: unknown, romName: string) => void;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockChild.on = vi.fn();
    mockChild.unref = vi.fn();
    mockStdout.on = vi.fn();
    mockStderr.on = vi.fn();

    mockGetZipInnerExtension.mockResolvedValue(null);

    const { ipcMain } = await import('electron');
    (ipcMain.on as Mock).mockImplementation(
      (_channel: string, fn: (...args: unknown[]) => void) => {
        handler = fn as typeof handler;
      },
    );

    registerLaunchMameHandler();
  });

  it('registers on the mame:launch channel', async () => {
    const { ipcMain } = await import('electron');

    expect(ipcMain.on).toHaveBeenCalledWith(
      SEND_CHANNELS.launchMame,
      expect.any(Function),
    );
  });

  it('spawns the launch script with the ROM name on macOS', async () => {
    const { spawn } = await import('child_process');
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'darwin' });

    try {
      handler({}, 'pacman');
      await vi.waitFor(() => {
        expect(spawn).toHaveBeenCalled();
      });

      expect(spawn).toHaveBeenCalledWith(
        join('/mock/.rgfx', 'launch-mame.sh'),
        ['pacman'],
        { detached: true },
      );
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    }
  });

  it('spawns via cmd.exe on Windows', async () => {
    const { spawn } = await import('child_process');
    const originalPlatform = process.platform;
    Object.defineProperty(process, 'platform', { value: 'win32' });

    try {
      handler({}, 'galaga');
      await vi.waitFor(() => {
        expect(spawn).toHaveBeenCalled();
      });

      expect(spawn).toHaveBeenCalledWith(
        'cmd.exe',
        ['/c', join('/mock/.rgfx', 'launch-mame.bat'), 'galaga'],
        { detached: true },
      );
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    }
  });

  it('calls unref on the spawned process', async () => {
    handler({}, 'pacman');
    await vi.waitFor(() => {
      expect(mockChild.unref).toHaveBeenCalled();
    });
  });

  it('registers an error listener on the spawned process', async () => {
    handler({}, 'pacman');
    await vi.waitFor(() => {
      expect(mockChild.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });
});
