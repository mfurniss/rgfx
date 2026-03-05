import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { registerGetLEDHardwareHandler } from '../get-led-hardware-handler';
import type { LEDHardwareManager } from '@/led-hardware-manager';
import type { LEDHardware } from '@/types';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

describe('registerGetLEDHardwareHandler', () => {
  let mockLedHardwareManager: MockProxy<LEDHardwareManager>;
  let registeredHandler: (event: unknown, hardwareRef: string) => LEDHardware | null;
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLedHardwareManager = mock<LEDHardwareManager>();

    ipc = await setupIpcHandlerCapture();

    registerGetLEDHardwareHandler({ ledHardwareManager: mockLedHardwareManager });

    registeredHandler = ipc.getHandler('led-hardware:get') as typeof registeredHandler;
  });

  it('registers the led-hardware:get handler', () => {
    ipc.assertChannel('led-hardware:get');
  });

  it('returns hardware when found', () => {
    const mockHardware = { name: 'Test Strip', layout: 'strip' } as unknown as LEDHardware;
    mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

    const result = registeredHandler({}, 'test-strip');

    expect(mockLedHardwareManager.loadHardware).toHaveBeenCalledWith('test-strip');
    expect(result).toEqual(mockHardware);
  });

  it('returns null when hardware not found', () => {
    mockLedHardwareManager.loadHardware.mockReturnValue(null);

    const result = registeredHandler({}, 'nonexistent');

    expect(result).toBeNull();
  });
});
