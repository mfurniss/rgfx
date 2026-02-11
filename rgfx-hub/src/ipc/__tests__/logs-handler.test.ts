/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { registerLogsHandler } from '../logs-handler';
import type { LogManager, LogSizes } from '@/log-manager';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
  },
}));

describe('registerLogsHandler', () => {
  let mockLogManager: MockProxy<LogManager>;
  let handlers: Record<string, (...args: unknown[]) => unknown>;

  beforeEach(async () => {
    vi.clearAllMocks();
    handlers = {};

    mockLogManager = mock<LogManager>();

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (channel: string, handler: (...args: unknown[]) => unknown) => {
        handlers[channel] = handler;
      },
    );

    registerLogsHandler({ logManager: mockLogManager });
  });

  it('registers logs:get-sizes handler', async () => {
    const { ipcMain } = await import('electron');
    expect(ipcMain.handle).toHaveBeenCalledWith('logs:get-sizes', expect.any(Function));
  });

  it('registers logs:clear-all handler', async () => {
    const { ipcMain } = await import('electron');
    expect(ipcMain.handle).toHaveBeenCalledWith('logs:clear-all', expect.any(Function));
  });

  it('get-sizes delegates to logManager.getSizes()', async () => {
    const mockSizes: LogSizes = {
      system: { path: '/logs/system.log', size: 1024 },
      events: { path: '/logs/events.log', size: 512 },
      drivers: [],
    };
    mockLogManager.getSizes.mockResolvedValue(mockSizes);

    const result = await handlers['logs:get-sizes']({});

    expect(mockLogManager.getSizes).toHaveBeenCalled();
    expect(result).toEqual(mockSizes);
  });

  it('clear-all delegates to logManager.clearAll()', async () => {
    mockLogManager.clearAll.mockResolvedValue(undefined);

    await handlers['logs:clear-all']({});

    expect(mockLogManager.clearAll).toHaveBeenCalled();
  });
});
