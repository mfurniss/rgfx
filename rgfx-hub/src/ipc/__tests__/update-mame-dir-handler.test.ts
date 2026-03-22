import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registerUpdateMameDirHandler } from '../update-mame-dir-handler';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

const { mockUpdateLaunchScriptMamePath, mockDetectMameVersion } = vi.hoisted(() => ({
  mockUpdateLaunchScriptMamePath: vi.fn().mockResolvedValue(undefined),
  mockDetectMameVersion: vi.fn().mockResolvedValue({ version: null, detectedPath: null }),
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
  const mockSystemMonitor = { setMameVersion: vi.fn(), setDetectedMamePath: vi.fn() };

  const originalPlatform = process.platform;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Default to darwin — tests for win32 override explicitly
    Object.defineProperty(process, 'platform', { value: 'darwin', configurable: true });

    ipc = await setupIpcHandlerCapture();
    registerUpdateMameDirHandler({ systemMonitor: mockSystemMonitor as never });

    registeredHandler = ipc.getHandler('settings:update-mame-dir') as typeof registeredHandler;
  });

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
  });

  it('registers the settings:update-mame-dir handler', () => {
    ipc.assertChannel('settings:update-mame-dir');
  });

  it('constructs exe path from directory on Windows and calls updater', async () => {
    Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

    const result = await registeredHandler({}, 'F:\\Mame');

    expect(mockUpdateLaunchScriptMamePath).toHaveBeenCalledWith('F:\\Mame\\mame.exe');
    expect(result.success).toBe(true);
  });

  it('constructs exe path from directory on macOS and calls updater', async () => {
    const result = await registeredHandler({}, '/opt/homebrew');

    expect(mockUpdateLaunchScriptMamePath).toHaveBeenCalledWith('/opt/homebrew/mame');
    expect(result.success).toBe(true);
  });

  it('clears MAME_PATH when directory is empty', async () => {
    const result = await registeredHandler({}, '');

    expect(mockUpdateLaunchScriptMamePath).toHaveBeenCalledWith('');
    expect(result.success).toBe(true);
  });

  it('detects MAME version and updates system monitor', async () => {
    mockDetectMameVersion.mockResolvedValue({ version: '0.286', detectedPath: '/opt/homebrew' });

    const result = await registeredHandler({}, '/opt/homebrew');

    expect(mockDetectMameVersion).toHaveBeenCalledWith('/opt/homebrew');
    expect(mockSystemMonitor.setMameVersion).toHaveBeenCalledWith('0.286');
    expect(mockSystemMonitor.setDetectedMamePath).toHaveBeenCalledWith('/opt/homebrew');
    expect(result.mameVersion).toBe('0.286');
  });

  it('returns undefined mameVersion when detection fails', async () => {
    mockDetectMameVersion.mockResolvedValue({ version: null, detectedPath: null });

    const result = await registeredHandler({}, '/nonexistent');

    expect(mockSystemMonitor.setMameVersion).toHaveBeenCalledWith(null);
    expect(mockSystemMonitor.setDetectedMamePath).toHaveBeenCalledWith(null);
    expect(result.mameVersion).toBeUndefined();
  });
});
