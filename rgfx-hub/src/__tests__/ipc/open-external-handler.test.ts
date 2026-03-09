import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupIpcHandlerCapture } from '../helpers/ipc-handler.helper';
import { registerOpenExternalHandler } from '../../ipc/open-external-handler';

const mockShell = vi.hoisted(() => ({
  openExternal: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  shell: mockShell,
}));

describe('open-external-handler', () => {
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ipc = await setupIpcHandlerCapture();
    registerOpenExternalHandler();
  });

  it('registers on the correct channel', () => {
    ipc.assertChannel('app:open-external');
  });

  it('calls shell.openExternal with the provided URL', async () => {
    const handler = ipc.getHandler('app:open-external');
    await handler({}, 'https://github.com/mfurniss/rgfx/releases');

    expect(mockShell.openExternal).toHaveBeenCalledWith(
      'https://github.com/mfurniss/rgfx/releases',
    );
  });
});
