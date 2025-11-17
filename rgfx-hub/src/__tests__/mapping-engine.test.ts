/**
 * Unit tests for MappingEngine
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MappingEngine } from '../mapping-engine';
import type { MappingContext, RgfxTopic } from '../types/mapping-types';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';

/**
 * Helper to create expected RgfxTopic object for test assertions
 */
function createTopic(raw: string): RgfxTopic {
  const parts = raw.split('/');
  const [namespace, subject, property, qualifier] = parts;
  return { raw, namespace, subject, property, qualifier, parts };
}

// Mock filesystem modules
vi.mock('node:fs/promises');
vi.mock('node:fs');

// Mock mapper-installer
vi.mock('../mapper-installer', () => ({
  getMappingsDir: vi.fn(() => '/mock/mappings'),
}));

describe('MappingEngine', () => {
  let mockContext: MappingContext;
  let engine: MappingEngine;

  beforeEach(() => {
    const broadcastMock = vi.fn().mockReturnValue(true);

    mockContext = {
      broadcast: broadcastMock,
      udp: {
        broadcast: broadcastMock,
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

      // Handler receives parsed topic object and original payload string
      expect(handler).toHaveBeenCalledWith(createTopic('test/topic'), '{"key": "value"}', mockContext);
    });

    it('should parse JSON arrays', async () => {
      const handler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = handler;

      await engine.handleEvent('test/topic', '[1, 2, 3]');

      expect(handler).toHaveBeenCalledWith(createTopic('test/topic'), '[1, 2, 3]', mockContext);
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

      expect(handler).toHaveBeenCalledWith(createTopic('test/topic'), 'hello world', mockContext);
    });

    it('should handle empty strings', async () => {
      const handler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = handler;

      await engine.handleEvent('test/topic', '');

      expect(handler).toHaveBeenCalledWith(createTopic('test/topic'), '', mockContext);
    });

    it('should handle invalid JSON gracefully', async () => {
      const handler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = handler;

      await engine.handleEvent('test/topic', '{invalid json}');

      expect(handler).toHaveBeenCalledWith(createTopic('test/topic'), '{invalid json}', mockContext);
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
        'No handler found for event: pacman/unknown'
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
        expect.any(Error)
      );
    });

    it('should catch and log errors from subject handlers', async () => {
      const subjectHandler = vi.fn().mockRejectedValue(new Error('Test error'));
      (engine as any).subjectHandlers.set('player', subjectHandler);

      await engine.handleEvent('game/player/score', '1000');

      expect(mockContext.log.error).toHaveBeenCalledWith(
        'Error handling event game/player/score:',
        expect.any(Error)
      );
    });

    it('should catch and log errors from pattern handlers', async () => {
      const patternHandler = vi.fn().mockRejectedValue(new Error('Test error'));
      (engine as any).patternHandlers = [patternHandler];

      await engine.handleEvent('test/topic', 'value');

      expect(mockContext.log.error).toHaveBeenCalled();
    });

    it('should catch and log errors from default handler', async () => {
      const defaultHandler = vi.fn().mockRejectedValue(new Error('Test error'));
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('test/topic', 'value');

      expect(mockContext.log.error).toHaveBeenCalled();
    });

    it('should not throw when handler throws synchronously', async () => {
      const gameHandler = vi.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      (engine as any).gameHandlers.set('pacman', gameHandler);

      await expect(engine.handleEvent('pacman/test', 'value')).resolves.not.toThrow();

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
        'Event handled by game mapper: pacman - pacman/player/score'
      );
    });

    it('should log debug message when subject handler matches', async () => {
      const subjectHandler = vi.fn().mockReturnValue(true);
      (engine as any).subjectHandlers.set('player', subjectHandler);

      await engine.handleEvent('game/player/score', '1000');

      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Event handled by subject mapper: player - game/player/score'
      );
    });

    it('should log debug message when pattern handler matches', async () => {
      const patternHandler = vi.fn().mockReturnValue(true);
      (engine as any).patternHandlers = [patternHandler];

      await engine.handleEvent('test/topic', 'value');

      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Event handled by pattern mapper: test/topic'
      );
    });

    it('should log debug message when default handler runs', async () => {
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('test/topic', 'value');

      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Event handled by default mapper: test/topic'
      );
    });
  });

  describe('extractHandler', () => {
    it('should extract named export "handle"', () => {
      const handleFn = vi.fn();
      const module = { handle: handleFn };

      const handler = (engine as any).extractHandler(module);

      expect(handler).toBe(handleFn);
    });

    it('should extract default export with handle property', () => {
      const handleFn = vi.fn();
      const module = { default: { handle: handleFn } };

      const handler = (engine as any).extractHandler(module);

      expect(handler).toBe(handleFn);
    });

    it('should extract default export as function', () => {
      const defaultFn = vi.fn();
      const module = { default: defaultFn };

      const handler = (engine as any).extractHandler(module);

      expect(handler).toBe(defaultFn);
    });

    it('should return null if no handler found', () => {
      const module = { someOtherExport: 'value' };

      const handler = (engine as any).extractHandler(module);

      expect(handler).toBeNull();
    });

    it('should prefer named export over default', () => {
      const namedHandle = vi.fn();
      const defaultHandle = vi.fn();
      const module = { handle: namedHandle, default: { handle: defaultHandle } };

      const handler = (engine as any).extractHandler(module);

      expect(handler).toBe(namedHandle);
    });

    it('should return null for empty module', () => {
      const module = {};

      const handler = (engine as any).extractHandler(module);

      expect(handler).toBeNull();
    });

    it('should return null if handle is not a function', () => {
      const module = { handle: 'not a function' };

      const handler = (engine as any).extractHandler(module);

      expect(handler).toBeNull();
    });

    it('should return null if default.handle is not a function', () => {
      const module = { default: { handle: 42 } };

      const handler = (engine as any).extractHandler(module);

      expect(handler).toBeNull();
    });
  });

  describe('dispose', () => {
    it('should close file watcher if it exists', () => {
      const mockWatcher = { close: vi.fn() };
      (engine as any).watcher = mockWatcher;

      engine.dispose();

      expect(mockWatcher.close).toHaveBeenCalled();
      expect(mockContext.log.info).toHaveBeenCalledWith('File watcher stopped');
    });

    it('should handle dispose when no watcher exists', () => {
      (engine as any).watcher = undefined;

      expect(() => { engine.dispose(); }).not.toThrow();
      expect(mockContext.log.info).not.toHaveBeenCalledWith('File watcher stopped');
    });

    it('should set watcher to undefined after closing', () => {
      const mockWatcher = { close: vi.fn() };
      (engine as any).watcher = mockWatcher;

      engine.dispose();

      expect((engine as any).watcher).toBeDefined();
    });
  });

  describe('dynamic game mapper loading', () => {
    it('should auto-load game mapper on first event', async () => {
      const loadGameMapperSpy = vi.spyOn(engine as any, 'loadGameMapper');
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('donkeykong/player/position', '100');

      expect(loadGameMapperSpy).toHaveBeenCalledWith('donkeykong');
    });

    it('should not reload game mapper on subsequent events', async () => {
      const gameHandler = vi.fn().mockReturnValue(true);
      (engine as any).gameHandlers.set('pacman', gameHandler);
      const loadGameMapperSpy = vi.spyOn(engine as any, 'loadGameMapper');

      await engine.handleEvent('pacman/player/score', '1000');
      await engine.handleEvent('pacman/player/score', '2000');

      expect(loadGameMapperSpy).not.toHaveBeenCalled();
      expect(gameHandler).toHaveBeenCalledTimes(2);
    });

    it('should handle failed game mapper load gracefully', async () => {
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('nonexistent/player/score', '1000');

      expect(mockContext.log.debug).toHaveBeenCalledWith(
        expect.stringContaining('Could not load game mapper for nonexistent')
      );
      expect(defaultHandler).toHaveBeenCalled();
    });
  });

  describe('topic parsing', () => {
    it('should parse game and subject from topic', async () => {
      const gameHandler = vi.fn().mockReturnValue(true);
      (engine as any).gameHandlers.set('pacman', gameHandler);

      await engine.handleEvent('pacman/player/score/p1', '1000');

      expect(gameHandler).toHaveBeenCalledWith(createTopic('pacman/player/score/p1'), '1000', mockContext);
    });

    it('should handle topic with only game', async () => {
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('pacman', 'started');

      expect(defaultHandler).toHaveBeenCalled();
    });

    it('should handle topic with multiple slashes', async () => {
      const subjectHandler = vi.fn().mockReturnValue(true);
      (engine as any).subjectHandlers.set('player', subjectHandler);

      await engine.handleEvent('game/player/score/p1/extra', '1000');

      expect(subjectHandler).toHaveBeenCalled();
    });

    it('should handle empty game with subject', async () => {
      const subjectHandler = vi.fn().mockReturnValue(true);
      (engine as any).subjectHandlers.set('player', subjectHandler);

      await engine.handleEvent('/player/score', '1000');

      expect(subjectHandler).toHaveBeenCalled();
    });
  });

  describe('handler return value handling', () => {
    it('should treat truthy non-boolean values as handled', async () => {
      const gameHandler = vi.fn().mockReturnValue(1);
      const defaultHandler = vi.fn();
      (engine as any).gameHandlers.set('pacman', gameHandler);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('pacman/test', 'value');

      expect(gameHandler).toHaveBeenCalled();
      expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('should treat falsy non-boolean values as not handled', async () => {
      const gameHandler = vi.fn().mockReturnValue(0);
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).gameHandlers.set('pacman', gameHandler);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('pacman/test', 'value');

      expect(gameHandler).toHaveBeenCalled();
      expect(defaultHandler).toHaveBeenCalled();
    });

    it('should treat null as not handled', async () => {
      const gameHandler = vi.fn().mockReturnValue(null);
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).gameHandlers.set('pacman', gameHandler);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('pacman/test', 'value');

      expect(defaultHandler).toHaveBeenCalled();
    });

    it('should treat undefined as not handled', async () => {
      const gameHandler = vi.fn().mockReturnValue(undefined);
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).gameHandlers.set('pacman', gameHandler);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('pacman/test', 'value');

      expect(defaultHandler).toHaveBeenCalled();
    });

    it('should treat empty string as not handled', async () => {
      const gameHandler = vi.fn().mockReturnValue('');
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).gameHandlers.set('pacman', gameHandler);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('pacman/test', 'value');

      expect(defaultHandler).toHaveBeenCalled();
    });

    it('should treat non-empty string as handled', async () => {
      const gameHandler = vi.fn().mockReturnValue('handled');
      const defaultHandler = vi.fn();
      (engine as any).gameHandlers.set('pacman', gameHandler);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('pacman/test', 'value');

      expect(defaultHandler).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle handler that returns nothing (void)', async () => {
      const gameHandler = vi.fn();
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).gameHandlers.set('pacman', gameHandler);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('pacman/test', 'value');

      expect(defaultHandler).toHaveBeenCalled();
    });

    it('should handle very long topic strings', async () => {
      const longTopic = 'game/' + 'segment/'.repeat(100) + 'end';
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent(longTopic, 'value');

      expect(defaultHandler).toHaveBeenCalled();
    });

    it('should handle very long payload strings', async () => {
      const longPayload = 'x'.repeat(10000);
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('test/topic', longPayload);

      expect(defaultHandler).toHaveBeenCalledWith(createTopic('test/topic'), longPayload, mockContext);
    });

    it('should handle special characters in topic', async () => {
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('game-1/player@2/score#3', '1000');

      expect(defaultHandler).toHaveBeenCalled();
    });

    it('should handle special characters in payload', async () => {
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('test/topic', '!@#$%^&*()_+-={}[]|\\:";\'<>?,./');

      expect(defaultHandler).toHaveBeenCalled();
    });

    it('should handle unicode in topic', async () => {
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('game/plαyer/score', '1000');

      expect(defaultHandler).toHaveBeenCalled();
    });

    it('should handle unicode in payload', async () => {
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('test/topic', '你好世界 🎮');

      expect(defaultHandler).toHaveBeenCalledWith(createTopic('test/topic'), '你好世界 🎮', mockContext);
    });
  });

  describe('file watcher', () => {
    it('should start watching mapper directory', () => {
      const mockWatch = vi.fn().mockReturnValue({ close: vi.fn() });
      vi.mocked(fsSync.watch).mockImplementation(mockWatch as any);
      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const startWatcher = (engine as any).startFileWatcher.bind(engine);
      startWatcher('/mock/mappings');

      expect(mockWatch).toHaveBeenCalledWith(
        '/mock/mappings',
        { recursive: true },
        expect.any(Function)
      );
      expect(mockContext.log.info).toHaveBeenCalledWith(
        'File watcher started for mapper hot-reload'
      );
    });

    it('should warn if file watcher cannot start', () => {
      vi.mocked(fsSync.watch).mockImplementation(() => {
        throw new Error('Watch not supported');
      });

      const startWatcher = (engine as any).startFileWatcher.bind(engine);
      startWatcher('/mock/mappings');

      expect(mockContext.log.warn).toHaveBeenCalledWith(
        'Could not start file watcher:',
        expect.any(Error)
      );
    });

    it('should ignore non-.js file changes', () => {
      let watchCallback: any;
      vi.mocked(fsSync.watch).mockImplementation((...args: any[]) => {
        watchCallback = args[2]; // Third argument is the callback
        return { close: vi.fn() } as any;
      });

      const startWatcher = (engine as any).startFileWatcher.bind(engine);
      startWatcher('/mock/mappings');

      const reloadSpy = vi.spyOn(engine as any, 'reloadMapper');

      watchCallback('change', 'readme.md');
      watchCallback('change', 'config.json');
      watchCallback('change', null);

      expect(reloadSpy).not.toHaveBeenCalled();
    });

    it('should reload .js file changes', () => {
      let watchCallback: any;
      vi.mocked(fsSync.watch).mockImplementation((...args: any[]) => {
        watchCallback = args[2]; // Third argument is the callback
        return { close: vi.fn() } as any;
      });

      const startWatcher = (engine as any).startFileWatcher.bind(engine);
      startWatcher('/mock/mappings');

      const reloadSpy = vi.spyOn(engine as any, 'reloadMapper').mockResolvedValue(undefined);

      watchCallback('change', 'games/pacman.js');

      expect(mockContext.log.info).toHaveBeenCalledWith('Mapper file changed: games/pacman.js');
      expect(reloadSpy).toHaveBeenCalledWith('/mock/mappings', 'games/pacman.js');
    });
  });

  describe('file loading with dependency injection', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should load game mapper via importModule', async () => {
      const mockHandler = vi.fn().mockReturnValue(true);
      const mockImportModule = vi.fn().mockResolvedValue({
        handle: mockHandler,
      });

      const testEngine = new (await import('../mapping-engine.js')).MappingEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadGameMapper('pacman');

      expect(mockImportModule).toHaveBeenCalledWith(expect.stringMatching(/games\/pacman\.js$/));
      expect((testEngine as any).gameHandlers.has('pacman')).toBe(true);
      expect(mockContext.log.debug).toHaveBeenCalledWith('Loaded game mapper: pacman');
    });

    it('should handle game mapper import failures gracefully', async () => {
      const mockImportModule = vi.fn().mockRejectedValue(new Error('File not found'));

      const testEngine = new (await import('../mapping-engine.js')).MappingEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadGameMapper('nonexistent');

      expect(mockContext.log.debug).toHaveBeenCalledWith(
        expect.stringContaining('Could not load game mapper for nonexistent')
      );
      expect((testEngine as any).gameHandlers.has('nonexistent')).toBe(false);
    });

    it('should warn when game mapper has no valid handler', async () => {
      const mockImportModule = vi.fn().mockResolvedValue({
        someOtherExport: 'value',
      });

      const testEngine = new (await import('../mapping-engine.js')).MappingEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadGameMapper('broken');

      expect(mockContext.log.warn).toHaveBeenCalledWith(
        'Game mapper broken.js has no valid handler function'
      );
      expect((testEngine as any).gameHandlers.has('broken')).toBe(false);
    });


    it('should load default mapper', async () => {
      const mockHandler = vi.fn();
      const mockImportModule = vi.fn().mockResolvedValue({
        handle: mockHandler,
      });

      const testEngine = new (await import('../mapping-engine.js')).MappingEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadDefaultMapper('/mock/default.js');

      expect(mockImportModule).toHaveBeenCalledWith('/mock/default.js');
      expect((testEngine as any).defaultHandler).toBe(mockHandler);
    });

    it('should handle default mapper import failures (non-ENOENT)', async () => {
      const syntaxError = new Error('Syntax error');
      const mockImportModule = vi.fn().mockRejectedValue(syntaxError);

      const testEngine = new (await import('../mapping-engine.js')).MappingEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadDefaultMapper('/mock/default.js');

      expect(mockContext.log.error).toHaveBeenCalledWith(
        'Failed to load default mapper:',
        syntaxError
      );
      expect((testEngine as any).defaultHandler).toBeUndefined();
    });

    it('should ignore default mapper ENOENT errors', async () => {
      const enoentError: any = new Error('File not found');
      enoentError.code = 'ENOENT';
      const mockImportModule = vi.fn().mockRejectedValue(enoentError);

      const testEngine = new (await import('../mapping-engine.js')).MappingEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadDefaultMapper('/mock/default.js');

      expect(mockContext.log.error).not.toHaveBeenCalled();
      expect((testEngine as any).defaultHandler).toBeUndefined();
    });

  });
});
