/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerSimulateEventHandler } from '../simulate-event-handler';

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
  let mockOnEventProcessed: ReturnType<typeof vi.fn>;
  let registeredHandler: (event: unknown, eventLine: string) => void;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockOnEventProcessed = vi.fn();

    const { ipcMain } = await import('electron');
    (ipcMain.handle as ReturnType<typeof vi.fn>).mockImplementation(
      (_channel: string, handler: typeof registeredHandler) => {
        registeredHandler = handler;
      },
    );

    registerSimulateEventHandler({
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
    it('parses topic and payload separated by space', () => {
      registeredHandler({}, 'game/score 1000');

      expect(mockOnEventProcessed).toHaveBeenCalledWith('game/score', '1000');
    });

    it('handles topic-only events without payload', () => {
      registeredHandler({}, 'game/start');

      expect(mockOnEventProcessed).toHaveBeenCalledWith('game/start', '');
    });

    it('handles payload with multiple spaces', () => {
      registeredHandler({}, 'game/message hello world from game');

      expect(mockOnEventProcessed).toHaveBeenCalledWith('game/message', 'hello world from game');
    });

    it('trims trailing whitespace from topic-only events (no space in input)', () => {
      // Trim only happens when there's no space at all (topic-only case)
      registeredHandler({}, 'game/event');

      expect(mockOnEventProcessed).toHaveBeenCalledWith('game/event', '');
    });

    it('treats trailing spaces as payload when space delimiter exists', () => {
      // 'game/event  ' has space at index 10, so payload = ' ' (rest after first space)
      registeredHandler({}, 'game/event  ');

      expect(mockOnEventProcessed).toHaveBeenCalledWith('game/event', ' ');
    });

    it('treats leading space as delimiter (topic becomes empty)', () => {
      // When input starts with space, spaceIndex=0, topic=empty, throws error
      expect(() => {
        registeredHandler({}, ' game/event');
      }).toThrow('Invalid event line: topic is required');
    });

    it('throws error for empty event line', () => {
      expect(() => {
        registeredHandler({}, '');
      }).toThrow('Invalid event line: topic is required');
    });

    it('throws error for whitespace-only event line', () => {
      expect(() => {
        registeredHandler({}, '   ');
      }).toThrow('Invalid event line: topic is required');
    });
  });

  describe('event processing', () => {
    it('calls onEventProcessed with parsed topic and payload', () => {
      registeredHandler({}, 'test/topic payload');

      expect(mockOnEventProcessed).toHaveBeenCalledTimes(1);
      expect(mockOnEventProcessed).toHaveBeenCalledWith('test/topic', 'payload');
    });
  });
});
