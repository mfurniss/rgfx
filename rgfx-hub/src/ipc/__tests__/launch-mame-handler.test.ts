import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { registerLaunchMameHandler } from '../launch-mame-handler';
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

const mockChild = { on: vi.fn(), unref: vi.fn() };

vi.mock('child_process', () => {
  const mock = { spawn: vi.fn(() => mockChild) };
  return { ...mock, default: mock };
});

describe('launch-mame-handler', () => {
  let handler: (event: unknown, romName: string) => void;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockChild.on = vi.fn();
    mockChild.unref = vi.fn();

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

      expect(spawn).toHaveBeenCalledWith(
        '/mock/.rgfx/launch-mame.sh',
        ['pacman'],
        { detached: true, stdio: 'ignore' },
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

      expect(spawn).toHaveBeenCalledWith(
        'cmd.exe',
        ['/c', '/mock/.rgfx/launch-mame.bat', 'galaga'],
        { detached: true, stdio: 'ignore' },
      );
    } finally {
      Object.defineProperty(process, 'platform', { value: originalPlatform });
    }
  });

  it('calls unref on the spawned process', () => {
    handler({}, 'pacman');

    expect(mockChild.unref).toHaveBeenCalled();
  });

  it('registers an error listener on the spawned process', () => {
    handler({}, 'pacman');

    expect(mockChild.on).toHaveBeenCalledWith('error', expect.any(Function));
  });
});
