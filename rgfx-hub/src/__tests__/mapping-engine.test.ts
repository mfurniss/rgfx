/**
 * Unit tests for MappingEngine
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MappingEngine } from '../mapping-engine';
import type { MappingContext } from '../types/mapping-types';

describe('MappingEngine', () => {
  let mockContext: MappingContext;
  let engine: MappingEngine;

  beforeEach(() => {
    // Create mock context with flattened broadcast methods that return true
    const broadcastMock = vi.fn().mockReturnValue(true);
    const sendMock = vi.fn().mockReturnValue(true);
    const sendToDriversMock = vi.fn().mockReturnValue(true);

    mockContext = {
      // Flattened UDP methods
      broadcast: broadcastMock,
      send: sendMock,
      sendToDrivers: sendToDriversMock,
      // Full service objects
      udp: {
        broadcast: broadcastMock,
        send: sendMock,
        sendToDrivers: sendToDriversMock,
      },
      mqtt: {
        publish: vi.fn(),
      },
      http: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
      },
      state: {
        get: vi.fn(),
        set: vi.fn(),
        has: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
      },
      log: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      },
      drivers: {} as any,
    };

    engine = new MappingEngine(mockContext);
  });

  describe('parsePayload', () => {
    it('should parse JSON objects', async () => {
      const handler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = handler;

      await engine.handleEvent('test/topic', '{"key": "value"}');

      // Handler receives original string, engine parses internally
      expect(handler).toHaveBeenCalledWith(
        'test/topic',
        '{"key": "value"}',
        mockContext,
      );
    });

    it('should parse JSON arrays', async () => {
      const handler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = handler;

      await engine.handleEvent('test/topic', '[1, 2, 3]');

      expect(handler).toHaveBeenCalledWith(
        'test/topic',
        '[1, 2, 3]',
        mockContext,
      );
    });

    it('should parse numbers', async () => {
      const handler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = handler;

      await engine.handleEvent('test/topic', '42');

      expect(handler).toHaveBeenCalled();
    });

    it('should parse negative numbers', async () => {
      const handler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = handler;

      await engine.handleEvent('test/topic', '-100');

      expect(handler).toHaveBeenCalled();
    });

    it('should parse decimal numbers', async () => {
      const handler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = handler;

      await engine.handleEvent('test/topic', '3.14');

      expect(handler).toHaveBeenCalled();
    });

    it('should keep strings as strings', async () => {
      const handler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = handler;

      await engine.handleEvent('test/topic', 'hello world');

      expect(handler).toHaveBeenCalledWith(
        'test/topic',
        'hello world',
        mockContext,
      );
    });

    it('should handle empty strings', async () => {
      const handler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = handler;

      await engine.handleEvent('test/topic', '');

      expect(handler).toHaveBeenCalledWith('test/topic', '', mockContext);
    });

    it('should handle invalid JSON gracefully', async () => {
      const handler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = handler;

      await engine.handleEvent('test/topic', '{invalid json}');

      expect(handler).toHaveBeenCalledWith(
        'test/topic',
        '{invalid json}',
        mockContext,
      );
    });
  });

  describe('cascading precedence', () => {
    it('should try game handler first', async () => {
      const gameHandler = vi.fn().mockReturnValue(true);
      const subjectHandler = vi.fn().mockReturnValue(true);
      const defaultHandler = vi.fn().mockReturnValue(true);

      (engine as any).gameHandlers.set('pacman', gameHandler);
      (engine as any).subjectHandlers.set('player', subjectHandler);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('pacman/player/score/p1', '1000');

      expect(gameHandler).toHaveBeenCalled();
      expect(subjectHandler).not.toHaveBeenCalled();
      expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('should fall through to subject handler if game returns false', async () => {
      const gameHandler = vi.fn().mockReturnValue(false);
      const subjectHandler = vi.fn().mockReturnValue(true);
      const defaultHandler = vi.fn().mockReturnValue(true);

      (engine as any).gameHandlers.set('pacman', gameHandler);
      (engine as any).subjectHandlers.set('player', subjectHandler);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('pacman/player/score/p1', '1000');

      expect(gameHandler).toHaveBeenCalled();
      expect(subjectHandler).toHaveBeenCalled();
      expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('should fall through to pattern handlers', async () => {
      const gameHandler = vi.fn().mockReturnValue(false);
      const subjectHandler = vi.fn().mockReturnValue(false);
      const patternHandler = vi.fn().mockReturnValue(true);
      const defaultHandler = vi.fn().mockReturnValue(true);

      (engine as any).gameHandlers.set('pacman', gameHandler);
      (engine as any).subjectHandlers.set('player', subjectHandler);
      (engine as any).patternHandlers = [patternHandler];
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('pacman/player/score/p1', '1000');

      expect(gameHandler).toHaveBeenCalled();
      expect(subjectHandler).toHaveBeenCalled();
      expect(patternHandler).toHaveBeenCalled();
      expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('should fall through to default handler', async () => {
      const gameHandler = vi.fn().mockReturnValue(false);
      const subjectHandler = vi.fn().mockReturnValue(false);
      const patternHandler = vi.fn().mockReturnValue(false);
      const defaultHandler = vi.fn().mockReturnValue(true);

      (engine as any).gameHandlers.set('pacman', gameHandler);
      (engine as any).subjectHandlers.set('player', subjectHandler);
      (engine as any).patternHandlers = [patternHandler];
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('pacman/player/score/p1', '1000');

      expect(gameHandler).toHaveBeenCalled();
      expect(subjectHandler).toHaveBeenCalled();
      expect(patternHandler).toHaveBeenCalled();
      expect(defaultHandler).toHaveBeenCalled();
    });

    it('should try multiple pattern handlers in order', async () => {
      const pattern1 = vi.fn().mockReturnValue(false);
      const pattern2 = vi.fn().mockReturnValue(true);
      const pattern3 = vi.fn().mockReturnValue(false);
      const defaultHandler = vi.fn().mockReturnValue(true);

      (engine as any).patternHandlers = [pattern1, pattern2, pattern3];
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('test/topic', 'value');

      expect(pattern1).toHaveBeenCalled();
      expect(pattern2).toHaveBeenCalled();
      expect(pattern3).not.toHaveBeenCalled(); // Stopped after pattern2
      expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('should handle missing game handler gracefully', async () => {
      const subjectHandler = vi.fn().mockReturnValue(true);
      const defaultHandler = vi.fn().mockReturnValue(true);

      (engine as any).subjectHandlers.set('player', subjectHandler);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('unknown-game/player/score', '1000');

      expect(subjectHandler).toHaveBeenCalled();
      expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('should handle missing subject handler gracefully', async () => {
      const gameHandler = vi.fn().mockReturnValue(false);
      const defaultHandler = vi.fn().mockReturnValue(true);

      (engine as any).gameHandlers.set('pacman', gameHandler);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('pacman/unknown-subject/property', 'value');

      expect(gameHandler).toHaveBeenCalled();
      expect(defaultHandler).toHaveBeenCalled();
    });

    it('should handle events with no game prefix', async () => {
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('simple-topic', 'value');

      expect(defaultHandler).toHaveBeenCalled();
    });

    it('should warn if no default handler and nothing matched', async () => {
      const gameHandler = vi.fn().mockReturnValue(false);
      (engine as any).gameHandlers.set('pacman', gameHandler);

      await engine.handleEvent('pacman/unknown', 'value');

      expect(mockContext.log.warn).toHaveBeenCalledWith(
        'No handler found for event: pacman/unknown',
      );
    });
  });

  describe('error handling', () => {
    it('should catch and log errors from game handlers', async () => {
      const gameHandler = vi.fn().mockRejectedValue(new Error('Test error'));
      (engine as any).gameHandlers.set('pacman', gameHandler);

      await engine.handleEvent('pacman/player/score', '1000');

      expect(mockContext.log.error).toHaveBeenCalledWith(
        'Error handling event pacman/player/score:',
        expect.any(Error),
      );
    });

    it('should catch and log errors from subject handlers', async () => {
      const subjectHandler = vi
        .fn()
        .mockRejectedValue(new Error('Test error'));
      (engine as any).subjectHandlers.set('player', subjectHandler);

      await engine.handleEvent('game/player/score', '1000');

      expect(mockContext.log.error).toHaveBeenCalledWith(
        'Error handling event game/player/score:',
        expect.any(Error),
      );
    });

    it('should catch and log errors from pattern handlers', async () => {
      const patternHandler = vi
        .fn()
        .mockRejectedValue(new Error('Test error'));
      (engine as any).patternHandlers = [patternHandler];

      await engine.handleEvent('test/topic', 'value');

      expect(mockContext.log.error).toHaveBeenCalled();
    });

    it('should catch and log errors from default handler', async () => {
      const defaultHandler = vi
        .fn()
        .mockRejectedValue(new Error('Test error'));
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('test/topic', 'value');

      expect(mockContext.log.error).toHaveBeenCalled();
    });

    it('should not throw when handler throws synchronously', async () => {
      const gameHandler = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      (engine as any).gameHandlers.set('pacman', gameHandler);

      await expect(
        engine.handleEvent('pacman/test', 'value'),
      ).resolves.not.toThrow();

      expect(mockContext.log.error).toHaveBeenCalled();
    });
  });

  describe('async handlers', () => {
    it('should wait for async game handler', async () => {
      const gameHandler = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return true;
      });

      (engine as any).gameHandlers.set('pacman', gameHandler);

      await engine.handleEvent('pacman/test', 'value');

      expect(gameHandler).toHaveBeenCalled();
    });

    it('should wait for async subject handler', async () => {
      const subjectHandler = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return true;
      });

      (engine as any).subjectHandlers.set('player', subjectHandler);

      await engine.handleEvent('game/player/test', 'value');

      expect(subjectHandler).toHaveBeenCalled();
    });

    it('should handle multiple async handlers in sequence', async () => {
      const calls: number[] = [];

      const handler1 = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        calls.push(1);
        return false;
      });

      const handler2 = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        calls.push(2);
        return true;
      });

      (engine as any).gameHandlers.set('test', handler1);
      (engine as any).subjectHandlers.set('test', handler2);

      await engine.handleEvent('test/test/prop', 'value');

      expect(calls).toEqual([1, 2]);
    });
  });

  describe('logging', () => {
    it('should log debug message when game handler matches', async () => {
      const gameHandler = vi.fn().mockReturnValue(true);
      (engine as any).gameHandlers.set('pacman', gameHandler);

      await engine.handleEvent('pacman/player/score', '1000');

      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Event handled by game mapper: pacman - pacman/player/score',
      );
    });

    it('should log debug message when subject handler matches', async () => {
      const subjectHandler = vi.fn().mockReturnValue(true);
      (engine as any).subjectHandlers.set('player', subjectHandler);

      await engine.handleEvent('game/player/score', '1000');

      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Event handled by subject mapper: player - game/player/score',
      );
    });

    it('should log debug message when pattern handler matches', async () => {
      const patternHandler = vi.fn().mockReturnValue(true);
      (engine as any).patternHandlers = [patternHandler];

      await engine.handleEvent('test/topic', 'value');

      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Event handled by pattern mapper: test/topic',
      );
    });

    it('should log debug message when default handler runs', async () => {
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('test/topic', 'value');

      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Event handled by default mapper: test/topic',
      );
    });
  });
});
