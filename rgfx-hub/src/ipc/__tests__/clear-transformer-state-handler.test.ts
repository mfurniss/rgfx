/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerClearTransformerStateHandler } from '../clear-transformer-state-handler';

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

describe('registerClearTransformerStateHandler', () => {
  let mockClearState: ReturnType<typeof vi.fn>;
  let registeredHandler: () => void;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockClearState = vi.fn();

    const mockTransformerEngine = {
      clearState: mockClearState,
    };

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (_channel: string, handler: () => void) => {
        registeredHandler = handler;
      },
    );

    registerClearTransformerStateHandler({
      transformerEngine: mockTransformerEngine as never,
    });
  });

  it('registers the transformer:clear-state handler', async () => {
    const { ipcMain } = await import('electron');
    expect(ipcMain.handle).toHaveBeenCalledWith('transformer:clear-state', expect.any(Function));
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
