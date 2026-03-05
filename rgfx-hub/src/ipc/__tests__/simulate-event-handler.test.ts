import { describe, it, expect, beforeEach, vi } from 'vitest';
import { registerSimulateEventHandler } from '../simulate-event-handler';
import { setupIpcHandlerCapture } from '@/__tests__/helpers/ipc-handler.helper';

describe('registerSimulateEventHandler', () => {
  let mockOnEventProcessed: ReturnType<typeof vi.fn>;
  let registeredHandler: (event: unknown, eventLine: string) => void;
  let ipc: Awaited<ReturnType<typeof setupIpcHandlerCapture>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockOnEventProcessed = vi.fn();

    ipc = await setupIpcHandlerCapture();

    registerSimulateEventHandler({
      onEventProcessed: mockOnEventProcessed,
    });

    registeredHandler = ipc.getHandler('event:simulate') as typeof registeredHandler;
  });

  describe('handler registration', () => {
    it('registers handler for event:simulate channel', () => {
      ipc.assertChannel('event:simulate');
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
