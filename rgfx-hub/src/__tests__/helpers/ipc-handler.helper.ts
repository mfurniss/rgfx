import { vi, expect } from 'vitest';

type Handler = (...args: unknown[]) => unknown;

/**
 * Sets up ipcMain.handle mock to capture registered handlers.
 * Call in beforeEach BEFORE registering your handler.
 *
 * @example
 * let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;
 *
 * beforeEach(async () => {
 *   ipc = await setupIpcHandlerCapture();
 *   registerMyHandler({ ... });
 * });
 *
 * it('registers the handler', () => {
 *   ipc.assertChannel('driver:my-action');
 * });
 *
 * it('does something', () => {
 *   const handler = ipc.getHandler('driver:my-action') as (event: unknown, id: string) => void;
 *   handler({}, 'driver-1');
 * });
 */
export async function setupIpcHandlerCapture() {
  const handlers = new Map<string, Handler>();

  const { ipcMain } = await import('electron');
  (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
    (channel: string, handler: Handler) => {
      handlers.set(channel, handler);
    },
  );

  return {
    getHandler: (channel: string): Handler => {
      const handler = handlers.get(channel);

      if (!handler) {
        throw new Error(`No handler registered for channel: ${channel}`);
      }

      return handler;
    },

    assertChannel: (channel: string) => {
      expect(ipcMain.handle).toHaveBeenCalledWith(channel, expect.any(Function));
    },
  };
}
