import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stat } from 'fs/promises';
import { registerVerifyDirectoryHandler } from '@/ipc/verify-directory-handler';

vi.mock('fs/promises');

type Handler = (...args: unknown[]) => unknown;

const { handlers, mockHandle } = vi.hoisted(() => {
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    mockHandle: vi.fn((channel: string, handler: Handler) => {
      handlers.set(channel, handler);
    }),
  };
});

vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
}));

const mockStat = vi.mocked(stat);

function getHandler(channel: string): Handler {
  const handler = handlers.get(channel);

  if (!handler) {
    throw new Error(`No handler registered for channel: ${channel}`);
  }
  return handler;
}

describe('verify-directory-handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    registerVerifyDirectoryHandler();
  });

  it('should register handler for fs:verify-directory', () => {
    const handler = getHandler('fs:verify-directory');
    expect(handler).toBeDefined();
  });

  it('should return true for existing directory', async () => {
    mockStat.mockResolvedValue({ isDirectory: () => true } as any);

    const handler = getHandler('fs:verify-directory');
    const result = await handler({}, '/test/mydir');
    expect(result).toBe(true);
  });

  it('should return false for non-existent path', async () => {
    mockStat.mockRejectedValue(new Error('ENOENT'));

    const handler = getHandler('fs:verify-directory');
    const result = await handler({}, '/nonexistent');
    expect(result).toBe(false);
  });

  it('should return false for file (not directory)', async () => {
    mockStat.mockResolvedValue({ isDirectory: () => false } as any);

    const handler = getHandler('fs:verify-directory');
    const result = await handler({}, '/test/file.txt');
    expect(result).toBe(false);
  });
});
