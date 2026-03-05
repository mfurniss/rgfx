import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerClearTransformerStateHandler } from '../clear-transformer-state-handler';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

describe('registerClearTransformerStateHandler', () => {
  let mockClearState: ReturnType<typeof vi.fn>;
  let registeredHandler: () => void;
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockClearState = vi.fn();

    const mockTransformerEngine = {
      clearState: mockClearState,
    };

    ipc = await setupIpcHandlerCapture();

    registerClearTransformerStateHandler({
      transformerEngine: mockTransformerEngine as never,
    });

    registeredHandler = ipc.getHandler('transformer:clear-state') as () => void;
  });

  it('registers the transformer:clear-state handler', () => {
    ipc.assertChannel('transformer:clear-state');
  });

  describe('handler behavior', () => {
    it('calls transformerEngine.clearState when invoked', () => {
      registeredHandler();

      expect(mockClearState).toHaveBeenCalledTimes(1);
    });

    it('can be called multiple times', () => {
      registeredHandler();
      registeredHandler();
      registeredHandler();

      expect(mockClearState).toHaveBeenCalledTimes(3);
    });
  });
});
