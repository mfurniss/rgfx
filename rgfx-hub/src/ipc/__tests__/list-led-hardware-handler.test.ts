import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { registerListLEDHardwareHandler } from '../list-led-hardware-handler';
import type { LEDHardwareManager } from '@/led-hardware-manager';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

describe('registerListLEDHardwareHandler', () => {
  let mockLedHardwareManager: MockProxy<LEDHardwareManager>;
  let registeredHandler: () => unknown;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLedHardwareManager = mock<LEDHardwareManager>();

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (_channel: string, handler: () => unknown) => {
        registeredHandler = handler;
      },
    );

    registerListLEDHardwareHandler({ ledHardwareManager: mockLedHardwareManager });
  });

  it('registers the led-hardware:list handler', async () => {
    const { ipcMain } = await import('electron');
    expect(ipcMain.handle).toHaveBeenCalledWith('led-hardware:list', expect.any(Function));
  });

  it('delegates to ledHardwareManager.listHardware()', () => {
    const mockList = [
      { ref: 'strip-30', name: '30 LED Strip' },
      { ref: 'matrix-8x8', name: '8x8 Matrix' },
    ];
    mockLedHardwareManager.listHardware.mockReturnValue(mockList as never);

    const result = registeredHandler();

    expect(mockLedHardwareManager.listHardware).toHaveBeenCalled();
    expect(result).toEqual(mockList);
  });
});
