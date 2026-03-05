import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { registerSetDriverFallbackHandler } from '../set-driver-fallback-handler';
import type { UdpClient } from '@/types/transformer-types';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

describe('registerSetDriverFallbackHandler', () => {
  let mockUdpClient: MockProxy<UdpClient>;
  let registeredHandler: (event: unknown, enabled: boolean) => { success: boolean };
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockUdpClient = mock<UdpClient>();

    ipc = await setupIpcHandlerCapture();

    registerSetDriverFallbackHandler({
      udpClient: mockUdpClient,
    });

    registeredHandler = ipc.getHandler('settings:set-driver-fallback') as typeof registeredHandler;
  });

  it('registers the settings:set-driver-fallback handler', () => {
    ipc.assertChannel('settings:set-driver-fallback');
  });

  it('calls setDriverFallbackEnabled with true', () => {
    const result = registeredHandler({}, true);

    expect(mockUdpClient.setDriverFallbackEnabled)
      .toHaveBeenCalledWith(true);
    expect(result).toEqual({ success: true });
  });

  it('calls setDriverFallbackEnabled with false', () => {
    const result = registeredHandler({}, false);

    expect(mockUdpClient.setDriverFallbackEnabled)
      .toHaveBeenCalledWith(false);
    expect(result).toEqual({ success: true });
  });
});
