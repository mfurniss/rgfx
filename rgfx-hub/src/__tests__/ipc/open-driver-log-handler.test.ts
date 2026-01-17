import { describe, it, expect, vi, beforeEach } from 'vitest';
import { registerOpenDriverLogHandler } from '@/ipc/open-driver-log-handler';

type Handler = (...args: unknown[]) => unknown;

const { handlers, mockHandle, mockOpenFile } = vi.hoisted(() => {
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    mockHandle: vi.fn((channel: string, handler: Handler) => {
      handlers.set(channel, handler);
    }),
    mockOpenFile: vi.fn(),
  };
});

vi.mock('electron', () => ({
  ipcMain: { handle: mockHandle },
}));

vi.mock('@/ipc/open-file-handler', () => ({
  openFile: mockOpenFile,
}));

function getHandler(channel: string): Handler {
  const handler = handlers.get(channel);

  if (!handler) {
    throw new Error(`No handler registered for channel: ${channel}`);
  }
  return handler;
}

describe('open-driver-log-handler', () => {
  const mockDriverLogPersistence = {
    getLogFilePath: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    registerOpenDriverLogHandler({ driverLogPersistence: mockDriverLogPersistence as any });
  });

  it('should register handler for driver:open-log', () => {
    const handler = getHandler('driver:open-log');
    expect(handler).toBeDefined();
  });

  it('should get log path from persistence and call openFile', async () => {
    mockDriverLogPersistence.getLogFilePath.mockReturnValue('/logs/test-driver.log');
    mockOpenFile.mockResolvedValue(undefined);

    const handler = getHandler('driver:open-log');
    await handler({}, 'test-driver');

    expect(mockDriverLogPersistence.getLogFilePath).toHaveBeenCalledWith('test-driver');
    expect(mockOpenFile).toHaveBeenCalledWith('/logs/test-driver.log');
  });

  it('should return result from openFile', async () => {
    mockDriverLogPersistence.getLogFilePath.mockReturnValue('/logs/test.log');
    mockOpenFile.mockResolvedValue('success');

    const handler = getHandler('driver:open-log');
    const result = await handler({}, 'driver-id');

    expect(result).toBe('success');
  });
});
