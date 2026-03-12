import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { registerReinstallAssetsHandler } from '../reinstall-assets-handler';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const mockReinstallAllAssets = vi.fn();

vi.mock('../../asset-reinstaller', () => ({
  reinstallAllAssets: (...args: unknown[]) => mockReinstallAllAssets(...args),
}));

describe('registerReinstallAssetsHandler', () => {
  let handler: (...args: unknown[]) => Promise<{ success: boolean; error?: string }>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { ipcMain } = await import('electron');
    (ipcMain.handle as Mock).mockImplementation(
      (_channel: string, fn: (...args: unknown[]) => Promise<unknown>) => {
        handler = fn as typeof handler;
      },
    );

    registerReinstallAssetsHandler();
  });

  it('registers handler for assets:reinstall channel', async () => {
    const { ipcMain } = await import('electron');

    expect(ipcMain.handle).toHaveBeenCalledWith('assets:reinstall', expect.any(Function));
  });

  it('returns success when reinstall completes', async () => {
    mockReinstallAllAssets.mockResolvedValue(undefined);

    const result = await handler({});

    expect(mockReinstallAllAssets).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ success: true });
  });

  it('returns error when reinstall fails', async () => {
    mockReinstallAllAssets.mockRejectedValue(new Error('Permission denied'));

    const result = await handler({});

    expect(result).toEqual({ success: false, error: 'Permission denied' });
  });
});
