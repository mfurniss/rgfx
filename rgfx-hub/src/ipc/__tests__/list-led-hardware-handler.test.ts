import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { registerListLEDHardwareHandler } from '../list-led-hardware-handler';
import type { LEDHardwareManager } from '@/led-hardware-manager';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

describe('registerListLEDHardwareHandler', () => {
  let mockLedHardwareManager: MockProxy<LEDHardwareManager>;
  let registeredHandler: () => unknown;
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLedHardwareManager = mock<LEDHardwareManager>();

    ipc = await setupIpcHandlerCapture();

    registerListLEDHardwareHandler({ ledHardwareManager: mockLedHardwareManager });

    registeredHandler = ipc.getHandler('led-hardware:list') as () => unknown;
  });

  it('registers the led-hardware:list handler', () => {
    ipc.assertChannel('led-hardware:list');
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
