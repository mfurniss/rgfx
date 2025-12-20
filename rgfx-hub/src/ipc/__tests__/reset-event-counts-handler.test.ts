/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerResetEventCountsHandler } from '../reset-event-counts-handler';

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

describe('registerResetEventCountsHandler', () => {
  let mockResetEventCounts: ReturnType<typeof vi.fn>;
  let registeredHandler: () => void;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockResetEventCounts = vi.fn();

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (_channel: string, handler: () => void) => {
        registeredHandler = handler;
      },
    );

    registerResetEventCountsHandler({
      resetEventCounts: mockResetEventCounts,
    });
  });

  it('registers the event:reset handler', async () => {
    const { ipcMain } = await import('electron');
    expect(ipcMain.handle).toHaveBeenCalledWith('event:reset', expect.any(Function));
  });

  describe('handler behavior', () => {
    it('calls resetEventCounts when invoked', () => {
      registeredHandler();

      expect(mockResetEventCounts).toHaveBeenCalledTimes(1);
    });

    it('can be called multiple times', () => {
      registeredHandler();
      registeredHandler();
      registeredHandler();

      expect(mockResetEventCounts).toHaveBeenCalledTimes(3);
    });
  });
});
