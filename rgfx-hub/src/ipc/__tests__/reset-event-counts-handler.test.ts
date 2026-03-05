import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerResetEventCountsHandler } from '../reset-event-counts-handler';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

describe('registerResetEventCountsHandler', () => {
  let mockResetEventsProcessed: ReturnType<typeof vi.fn>;
  let registeredHandler: () => void;
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockResetEventsProcessed = vi.fn();

    ipc = await setupIpcHandlerCapture();

    registerResetEventCountsHandler({
      resetEventsProcessed: mockResetEventsProcessed,
    });

    registeredHandler = ipc.getHandler('event:reset') as () => void;
  });

  it('registers the event:reset handler', () => {
    ipc.assertChannel('event:reset');
  });

  describe('handler behavior', () => {
    it('calls resetEventsProcessed when invoked', () => {
      registeredHandler();

      expect(mockResetEventsProcessed).toHaveBeenCalledTimes(1);
    });

    it('can be called multiple times', () => {
      registeredHandler();
      registeredHandler();
      registeredHandler();

      expect(mockResetEventsProcessed).toHaveBeenCalledTimes(3);
    });
  });
});
