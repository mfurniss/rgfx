import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerUpdateMameRomsDirHandler } from '../update-mame-roms-dir-handler';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

const { mockInstallLaunchScript } = vi.hoisted(() => ({
  mockInstallLaunchScript: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/launch-script-installer', () => ({
  installLaunchScript: mockInstallLaunchScript,
}));

describe('registerUpdateMameRomsDirHandler', () => {
  let registeredHandler: (event: unknown, romsDirectory: string) => Promise<{ success: boolean }>;
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    ipc = await setupIpcHandlerCapture();
    registerUpdateMameRomsDirHandler();

    registeredHandler = ipc.getHandler('settings:update-mame-roms-dir') as typeof registeredHandler;
  });

  it('registers the settings:update-mame-roms-dir handler', () => {
    ipc.assertChannel('settings:update-mame-roms-dir');
  });

  it('calls installLaunchScript with forceOverwrite and romPath', async () => {
    const result = await registeredHandler({}, 'D:\\MyRoms');

    expect(mockInstallLaunchScript).toHaveBeenCalledWith({
      forceOverwrite: true,
      romPath: 'D:\\MyRoms',
    });
    expect(result).toEqual({ success: true });
  });

  it('passes the ROM directory path through', async () => {
    await registeredHandler({}, '/home/user/roms');

    expect(mockInstallLaunchScript).toHaveBeenCalledWith({
      forceOverwrite: true,
      romPath: '/home/user/roms',
    });
  });
});
