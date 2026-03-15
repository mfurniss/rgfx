import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerSelectVideoFileHandler } from '../select-video-file-handler';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

const { mockDialog } = vi.hoisted(() => ({
  mockDialog: {
    showOpenDialog: vi.fn(),
  },
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  dialog: mockDialog,
}));

describe('registerSelectVideoFileHandler', () => {
  let handler: (_event: unknown) => Promise<string | null>;
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;

  beforeEach(async () => {
    vi.clearAllMocks();
    ipc = await setupIpcHandlerCapture();
    registerSelectVideoFileHandler();
    handler = ipc.getHandler('dialog:select-video-file') as typeof handler;
  });

  it('should register handler on correct channel', () => {
    ipc.assertChannel('dialog:select-video-file');
  });

  it('should return selected file path', async () => {
    mockDialog.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['/Users/test/video.mp4'],
    });

    const result = await handler(null);

    expect(result).toBe('/Users/test/video.mp4');
  });

  it('should return null when dialog is cancelled', async () => {
    mockDialog.showOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: [],
    });

    const result = await handler(null);

    expect(result).toBeNull();
  });

  it('should return null when no file is selected', async () => {
    mockDialog.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [],
    });

    const result = await handler(null);

    expect(result).toBeNull();
  });

  it('should open dialog with video file filters', async () => {
    mockDialog.showOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: [],
    });

    await handler(null);

    expect(mockDialog.showOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({
        properties: ['openFile'],
        filters: expect.arrayContaining([
          expect.objectContaining({
            extensions: expect.arrayContaining(['mp4', 'webm', 'avi', 'mov', 'mkv']),
          }),
        ]),
      }),
    );
  });
});
