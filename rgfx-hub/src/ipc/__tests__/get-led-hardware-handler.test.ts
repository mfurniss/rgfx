/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { registerGetLEDHardwareHandler } from '../get-led-hardware-handler';
import type { LEDHardwareManager } from '@/led-hardware-manager';
import type { LEDHardware } from '@/types';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

describe('registerGetLEDHardwareHandler', () => {
  let mockLedHardwareManager: MockProxy<LEDHardwareManager>;
  let registeredHandler: (event: unknown, hardwareRef: string) => LEDHardware | null;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockLedHardwareManager = mock<LEDHardwareManager>();

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (_channel: string, handler: (event: unknown, hardwareRef: string) => LEDHardware | null) => {
        registeredHandler = handler;
      },
    );

    registerGetLEDHardwareHandler({ ledHardwareManager: mockLedHardwareManager });
  });

  it('registers the led-hardware:get handler', async () => {
    const { ipcMain } = await import('electron');
    expect(ipcMain.handle).toHaveBeenCalledWith('led-hardware:get', expect.any(Function));
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
