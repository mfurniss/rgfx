import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerLoadGifHandler } from '../load-gif-handler';

const mockShowOpenDialog = vi.fn();
const mockLoadGif = vi.fn();
const mockEventBusEmit = vi.fn();

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
  dialog: {
    showOpenDialog: (...args: unknown[]) => mockShowOpenDialog(...args),
  },
}));

vi.mock('../../gif-loader', () => ({
  loadGif: (...args: unknown[]) => mockLoadGif(...args),
}));

vi.mock('../../services/event-bus', () => ({
  eventBus: {
    emit: (...args: unknown[]) => mockEventBusEmit(...args),
  },
}));

describe('registerLoadGifHandler', () => {
  let handler: (...args: unknown[]) => Promise<unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (_channel: string, fn: (...args: unknown[]) => Promise<unknown>) => {
        handler = fn;
      },
    );

    registerLoadGifHandler();
  });

  it('registers the dialog:load-gif handler', async () => {
    const { ipcMain } = await import('electron');
    expect(ipcMain.handle).toHaveBeenCalledWith('dialog:load-gif', expect.any(Function));
  });

  it('returns null when dialog is cancelled', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

    const result = await handler({});

    expect(result).toBeNull();
    expect(mockLoadGif).not.toHaveBeenCalled();
  });

  it('returns null when no file selected', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: [] });

    const result = await handler({});

    expect(result).toBeNull();
  });

  it('loads and returns GIF result with filePath', async () => {
    const gifResult = {
      images: [['FF']],
      palette: ['#FF0000'],
      width: 8,
      height: 8,
      frameCount: 1,
    };

    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/path/to/test.gif'] });
    mockLoadGif.mockResolvedValue(gifResult);

    const result = await handler({});

    expect(mockLoadGif).toHaveBeenCalledWith('/path/to/test.gif');
    expect(result).toEqual({ ...gifResult, filePath: '/path/to/test.gif' });
  });

  it('emits system:error and returns null on load failure', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/path/to/bad.gif'] });
    mockLoadGif.mockRejectedValue(new Error('Invalid GIF format'));

    const result = await handler({});

    expect(result).toBeNull();
    expect(mockEventBusEmit).toHaveBeenCalledWith(
      'system:error',
      expect.objectContaining({
        errorType: 'general',
        message: 'Failed to load GIF: Invalid GIF format',
        filePath: '/path/to/bad.gif',
      }),
    );
  });

  it('handles non-Error thrown values', async () => {
    mockShowOpenDialog.mockResolvedValue({ canceled: false, filePaths: ['/path/to/bad.gif'] });
    mockLoadGif.mockRejectedValue('string error');

    const result = await handler({});

    expect(result).toBeNull();
    expect(mockEventBusEmit).toHaveBeenCalledWith(
      'system:error',
      expect.objectContaining({
        message: 'Failed to load GIF: string error',
      }),
    );
  });
});
