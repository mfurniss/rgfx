import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerSelectDirectoryHandler } from '@/ipc/select-directory-handler';

type Handler = (...args: unknown[]) => unknown;

const { handlers, mockHandle, mockShowOpenDialog } = vi.hoisted(() => {
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    mockHandle: vi.fn((channel: string, handler: Handler) => {
      handlers.set(channel, handler);
    }),
    mockShowOpenDialog: vi.fn(),
  };
});

vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
  dialog: { showOpenDialog: mockShowOpenDialog },
}));

function getHandler(channel: string): Handler {
  const handler = handlers.get(channel);

  if (!handler) {
    throw new Error(`No handler registered for channel: ${channel}`);
  }
  return handler;
}

describe('select-directory-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    registerSelectDirectoryHandler();
  });

  it('should register handler for dialog:select-directory', () => {
    const handler = getHandler('dialog:select-directory');
    expect(handler).toBeDefined();
  });

  it('should return selected directory path', async () => {
    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['/selected/directory'],
    });

    const handler = getHandler('dialog:select-directory');
    const result = await handler({});

    expect(result).toBe('/selected/directory');
    expect(mockShowOpenDialog).toHaveBeenCalledWith({
      title: 'Select Directory',
      defaultPath: undefined,
      properties: ['openDirectory', 'createDirectory'],
    });
  });

  it('should return null when dialog is canceled', async () => {
    mockShowOpenDialog.mockResolvedValue({
      canceled: true,
      filePaths: [],
    });

    const handler = getHandler('dialog:select-directory');
    const result = await handler({});

    expect(result).toBeNull();
  });

  it('should use custom title when provided', async () => {
    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['/path'],
    });

    const handler = getHandler('dialog:select-directory');
    await handler({}, 'Custom Title');

    expect(mockShowOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Custom Title' }),
    );
  });

  it('should use default path when provided', async () => {
    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['/path'],
    });

    const handler = getHandler('dialog:select-directory');
    await handler({}, undefined, '/default/path');

    expect(mockShowOpenDialog).toHaveBeenCalledWith(
      expect.objectContaining({ defaultPath: '/default/path' }),
    );
  });

  it('should return null when no paths selected', async () => {
    mockShowOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: [],
    });

    const handler = getHandler('dialog:select-directory');
    const result = await handler({});

    expect(result).toBeNull();
  });
});
