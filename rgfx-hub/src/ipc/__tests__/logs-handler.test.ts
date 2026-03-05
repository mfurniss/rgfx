import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { registerLogsHandler } from '../logs-handler';
import type { LogManager, LogSizes } from '@/log-manager';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

describe('registerLogsHandler', () => {
  let mockLogManager: MockProxy<LogManager>;
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLogManager = mock<LogManager>();

    ipc = await setupIpcHandlerCapture();

    registerLogsHandler({ logManager: mockLogManager });
  });

  it('registers logs:get-sizes handler', () => {
    ipc.assertChannel('logs:get-sizes');
  });

  it('registers logs:clear-all handler', () => {
    ipc.assertChannel('logs:clear-all');
  });

  it('get-sizes delegates to logManager.getSizes()', async () => {
    const mockSizes: LogSizes = {
      system: { path: '/logs/system.log', size: 1024 },
      events: { path: '/logs/events.log', size: 512 },
      drivers: [],
    };
    mockLogManager.getSizes.mockResolvedValue(mockSizes);

    const handler = ipc.getHandler('logs:get-sizes') as (event: unknown) => Promise<LogSizes>;
    const result = await handler({});

    expect(mockLogManager.getSizes).toHaveBeenCalled();
    expect(result).toEqual(mockSizes);
  });

  it('clear-all delegates to logManager.clearAll()', async () => {
    mockLogManager.clearAll.mockResolvedValue(undefined);

    const handler = ipc.getHandler('logs:clear-all') as (event: unknown) => Promise<void>;
    await handler({});

    expect(mockLogManager.clearAll).toHaveBeenCalled();
  });
});
