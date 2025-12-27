/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerSimulateEventHandler } from '../simulate-event-handler';
import type { TransformerEngine } from '@/transformer-engine';

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

describe('registerSimulateEventHandler', () => {
  let mockTransformerEngine: { handleEvent: ReturnType<typeof vi.fn> };
  let mockOnEventProcessed: ReturnType<typeof vi.fn>;
  let registeredHandler: (event: unknown, eventLine: string) => Promise<void>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockTransformerEngine = {
      handleEvent: vi.fn().mockResolvedValue(undefined),
    };
    mockOnEventProcessed = vi.fn();

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (_channel: string, handler: typeof registeredHandler) => {
        registeredHandler = handler;
      },
    );

    registerSimulateEventHandler({
      transformerEngine: mockTransformerEngine as unknown as TransformerEngine,
      onEventProcessed: mockOnEventProcessed,
    });
  });

  describe('handler registration', () => {
    it('registers handler for event:simulate channel', async () => {
      const { ipcMain } = await import('electron');
      expect(ipcMain.handle).toHaveBeenCalledWith('event:simulate', expect.any(Function));
    });
  });

  describe('event line parsing', () => {
    it('parses topic and payload separated by space', async () => {
      await registeredHandler({}, 'game/score 1000');

      expect(mockTransformerEngine.handleEvent).toHaveBeenCalledWith('game/score', '1000');
      expect(mockOnEventProcessed).toHaveBeenCalledWith('game/score', '1000');
    });

    it('handles topic-only events without payload', async () => {
      await registeredHandler({}, 'game/start');

      expect(mockTransformerEngine.handleEvent).toHaveBeenCalledWith('game/start', '');
      expect(mockOnEventProcessed).toHaveBeenCalledWith('game/start', '');
    });

    it('handles payload with multiple spaces', async () => {
      await registeredHandler({}, 'game/message hello world from game');

      expect(mockTransformerEngine.handleEvent).toHaveBeenCalledWith(
        'game/message',
        'hello world from game',
      );
    });

    it('trims trailing whitespace from topic-only events (no space in input)', async () => {
      // Trim only happens when there's no space at all (topic-only case)
      await registeredHandler({}, 'game/event');

      expect(mockTransformerEngine.handleEvent).toHaveBeenCalledWith('game/event', '');
    });

    it('treats trailing spaces as payload when space delimiter exists', async () => {
      // 'game/event  ' has space at index 10, so payload = ' ' (rest after first space)
      await registeredHandler({}, 'game/event  ');

      expect(mockTransformerEngine.handleEvent).toHaveBeenCalledWith('game/event', ' ');
    });

    it('treats leading space as delimiter (topic becomes empty)', async () => {
      // When input starts with space, spaceIndex=0, topic=empty, throws error
      await expect(registeredHandler({}, ' game/event')).rejects.toThrow(
        'Invalid event line: topic is required',
      );
    });

    it('throws error for empty event line', async () => {
      await expect(registeredHandler({}, '')).rejects.toThrow('Invalid event line: topic is required');
    });

    it('throws error for whitespace-only event line', async () => {
      await expect(registeredHandler({}, '   ')).rejects.toThrow('Invalid event line: topic is required');
    });
  });

  describe('event processing', () => {
    it('calls transformer engine before onEventProcessed', async () => {
      const callOrder: string[] = [];

      mockTransformerEngine.handleEvent.mockImplementation(() => {
        callOrder.push('handleEvent');
        return Promise.resolve();
      });
      mockOnEventProcessed.mockImplementation(() => {
        callOrder.push('onEventProcessed');
      });

      await registeredHandler({}, 'test/topic payload');

      expect(callOrder).toEqual(['handleEvent', 'onEventProcessed']);
    });

    it('propagates transformer engine errors', async () => {
      mockTransformerEngine.handleEvent.mockRejectedValue(new Error('Transform failed'));

      await expect(registeredHandler({}, 'test/topic')).rejects.toThrow('Transform failed');
      expect(mockOnEventProcessed).not.toHaveBeenCalled();
    });
  });
});
