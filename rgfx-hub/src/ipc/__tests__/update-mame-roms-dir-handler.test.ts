import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerUpdateMameRomsDirHandler } from '../update-mame-roms-dir-handler';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

const { mockUpdateLaunchScriptRomPath } = vi.hoisted(() => ({
  mockUpdateLaunchScriptRomPath: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/launch-script-updater', () => ({
  updateLaunchScriptRomPath: mockUpdateLaunchScriptRomPath,
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

  it('calls updateLaunchScriptRomPath with the directory', async () => {
    const result = await registeredHandler({}, 'D:\\MyRoms');

    expect(mockUpdateLaunchScriptRomPath).toHaveBeenCalledWith('D:\\MyRoms');
    expect(result).toEqual({ success: true });
  });

  it('passes the ROM directory path through', async () => {
    await registeredHandler({}, '/home/user/roms');

    expect(mockUpdateLaunchScriptRomPath).toHaveBeenCalledWith('/home/user/roms');
  });
});
