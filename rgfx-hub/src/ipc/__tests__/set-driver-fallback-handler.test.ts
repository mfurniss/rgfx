import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { registerSetDriverFallbackHandler } from '../set-driver-fallback-handler';
import type { UdpClient } from '@/types/transformer-types';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('registerSetDriverFallbackHandler', () => {
  let mockUdpClient: MockProxy<UdpClient>;
  let registeredHandler: (
    event: unknown,
    enabled: boolean,
  ) => { success: boolean };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockUdpClient = mock<UdpClient>();

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (
        _channel: string,
        handler: (event: unknown, enabled: boolean) => { success: boolean },
      ) => {
        registeredHandler = handler;
      },
    );

    registerSetDriverFallbackHandler({
      udpClient: mockUdpClient,
    });
  });

  it('registers the settings:set-driver-fallback handler', async () => {
    const { ipcMain } = await import('electron');
    expect(ipcMain.handle).toHaveBeenCalledWith(
      'settings:set-driver-fallback',
      expect.any(Function),
    );
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
