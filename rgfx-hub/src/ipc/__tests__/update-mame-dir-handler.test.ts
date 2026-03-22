import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerUpdateMameDirHandler } from '../update-mame-dir-handler';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

const { mockUpdateLaunchScriptMamePath, mockDetectMameVersion } = vi.hoisted(() => ({
  mockUpdateLaunchScriptMamePath: vi.fn().mockResolvedValue(undefined),
  mockDetectMameVersion: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/launch-script-updater', () => ({
  updateLaunchScriptMamePath: mockUpdateLaunchScriptMamePath,
}));

vi.mock('@/mame-detector', () => ({
  detectMameVersion: mockDetectMameVersion,
}));

describe('registerUpdateMameDirHandler', () => {
  interface HandlerReturn {
    success: boolean;
    mameVersion?: string;
  }
  let registeredHandler: (
    event: unknown, mameDirectory: string,
  ) => Promise<HandlerReturn>;
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;
  const mockSystemMonitor = { setMameVersion: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();

    ipc = await setupIpcHandlerCapture();
    registerUpdateMameDirHandler({ systemMonitor: mockSystemMonitor as never });

    registeredHandler = ipc.getHandler('settings:update-mame-dir') as typeof registeredHandler;
  });

  it('registers the settings:update-mame-dir handler', () => {
    ipc.assertChannel('settings:update-mame-dir');
  });

  it('constructs exe path from directory on Windows and calls updater', async () => {
    const original = process.platform;
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

    const result = await registeredHandler({}, 'F:\\Mame');

    expect(mockUpdateLaunchScriptMamePath).toHaveBeenCalledWith('F:\\Mame\\mame.exe');
    expect(result.success).toBe(true);

    Object.defineProperty(process, 'platform', { value: original, configurable: true });
  });

  it('constructs exe path from directory on macOS and calls updater', async () => {
    const original = process.platform;
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

    const result = await registeredHandler({}, '/opt/homebrew');

    expect(mockUpdateLaunchScriptMamePath).toHaveBeenCalledWith('/opt/homebrew/mame');
    expect(result.success).toBe(true);

    Object.defineProperty(process, 'platform', { value: original, configurable: true });
  });

  it('clears MAME_PATH when directory is empty', async () => {
    const result = await registeredHandler({}, '');

    expect(mockUpdateLaunchScriptMamePath).toHaveBeenCalledWith('');
    expect(result.success).toBe(true);
  });

  it('detects MAME version and updates system monitor', async () => {
    mockDetectMameVersion.mockResolvedValue('0.286');

    const result = await registeredHandler({}, '/opt/homebrew');

    expect(mockDetectMameVersion).toHaveBeenCalledWith('/opt/homebrew');
    expect(mockSystemMonitor.setMameVersion).toHaveBeenCalledWith('0.286');
    expect(result.mameVersion).toBe('0.286');
  });

  it('returns undefined mameVersion when detection fails', async () => {
    mockDetectMameVersion.mockResolvedValue(null);

    const result = await registeredHandler({}, '/nonexistent');

    expect(mockSystemMonitor.setMameVersion).toHaveBeenCalledWith(null);
    expect(result.mameVersion).toBeUndefined();
  });
});
