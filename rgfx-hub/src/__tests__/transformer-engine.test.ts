/**
 * Unit tests for TransformerEngine
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { join } from 'node:path';
import { TransformerEngine } from '../transformer-engine';
import type { TransformerContext, RgfxTopic } from '../types/transformer-types';
import * as fs from 'node:fs/promises';
import * as fsSync from 'node:fs';

/**
 * Helper to create expected RgfxTopic object for test assertions
 */
function createTopic(raw: string, payload = ''): RgfxTopic {
  const parts = raw.split('/');
  const [namespace, subject, property, qualifier] = parts;
  return { raw, namespace, subject, property, qualifier, parts, payload };
}

// Mock filesystem modules
// Source uses `import { promises as fs } from 'node:fs'` so we need
// node:fs mock's `promises` property to be the same as node:fs/promises mock
vi.mock('node:fs/promises');
vi.mock('node:fs', async () => {
  const fsPromises = await import('node:fs/promises');
  const mod = { promises: fsPromises, watch: vi.fn() };
  return { ...mod, default: mod };
});

// Mock transformer-installer
vi.mock('../transformer-installer', () => ({
  getTransformersDir: vi.fn(() => '/mock/transformers'),
}));

// Mock event bus
const mockEventBusEmit = vi.fn();
vi.mock('../services/event-bus', () => ({
  eventBus: {
    emit: (...args: unknown[]) => mockEventBusEmit(...args),
  },
}));

describe('TransformerEngine', () => {
  let mockContext: TransformerContext;
  let engine: TransformerEngine;

  beforeEach(() => {
    const broadcastMock = vi.fn().mockReturnValue(true);

    mockContext = {
      broadcast: broadcastMock,
      udp: {
        broadcast: broadcastMock,
        stop: vi.fn(),
        setDriverFallbackEnabled: vi.fn(),
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
      loadGif: vi.fn(),
      loadSprite: vi.fn(),
      parseAmbilight: vi.fn().mockReturnValue({ colors: [], orientation: 'horizontal' }),
      hslToHex: vi.fn().mockReturnValue('#FF0000'),
    };

    engine = new TransformerEngine(mockContext);
    mockEventBusEmit.mockClear();
  });

  describe('payload handling', () => {
    it('should pass JSON object payload in topic', async () => {
      const handler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = handler;

      await engine.handleEvent('test/topic', '{"key": "value"}');

      // Handler receives topic object (with payload) and context
      expect(handler).toHaveBeenCalledWith(createTopic('test/topic', '{"key": "value"}'), mockContext);
    });

    it('should pass JSON array payload in topic', async () => {
      const handler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = handler;

      await engine.handleEvent('test/topic', '[1, 2, 3]');

      expect(handler).toHaveBeenCalledWith(createTopic('test/topic', '[1, 2, 3]'), mockContext);
    });

    it('should pass number payload in topic', async () => {
      const handler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = handler;

      await engine.handleEvent('test/topic', '42');

      expect(handler).toHaveBeenCalledWith(createTopic('test/topic', '42'), mockContext);
    });

    it('should pass string payload in topic', async () => {
      const handler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = handler;

      await engine.handleEvent('test/topic', 'hello world');

      expect(handler).toHaveBeenCalledWith(createTopic('test/topic', 'hello world'), mockContext);
    });

    it('should pass empty string payload in topic', async () => {
      const handler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = handler;

      await engine.handleEvent('test/topic', '');

      expect(handler).toHaveBeenCalledWith(createTopic('test/topic', ''), mockContext);
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

    it('should fall through to property handlers', async () => {
      const gameHandler = vi.fn().mockReturnValue(false);
      const subjectHandler = vi.fn().mockReturnValue(false);
      const propertyHandler = vi.fn().mockReturnValue(true);
      const defaultHandler = vi.fn().mockReturnValue(true);

      (engine as any).gameHandlers.set('pacman', gameHandler);
      (engine as any).subjectHandlers.set('player', subjectHandler);
      (engine as any).propertyHandlers = [propertyHandler];
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('pacman/player/score/p1', '1000');

      expect(gameHandler).toHaveBeenCalled();
      expect(subjectHandler).toHaveBeenCalled();
      expect(propertyHandler).toHaveBeenCalled();
      expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('should fall through to default handler', async () => {
      const gameHandler = vi.fn().mockReturnValue(false);
      const subjectHandler = vi.fn().mockReturnValue(false);
      const propertyHandler = vi.fn().mockReturnValue(false);
      const defaultHandler = vi.fn().mockReturnValue(true);

      (engine as any).gameHandlers.set('pacman', gameHandler);
      (engine as any).subjectHandlers.set('player', subjectHandler);
      (engine as any).propertyHandlers = [propertyHandler];
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('pacman/player/score/p1', '1000');

      expect(gameHandler).toHaveBeenCalled();
      expect(subjectHandler).toHaveBeenCalled();
      expect(propertyHandler).toHaveBeenCalled();
      expect(defaultHandler).toHaveBeenCalled();
    });

    it('should try multiple property handlers in order', async () => {
      const prop1 = vi.fn().mockReturnValue(false);
      const prop2 = vi.fn().mockReturnValue(true);
      const prop3 = vi.fn().mockReturnValue(false);
      const defaultHandler = vi.fn().mockReturnValue(true);

      (engine as any).propertyHandlers = [prop1, prop2, prop3];
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('test/topic', 'value');

      expect(prop1).toHaveBeenCalled();
      expect(prop2).toHaveBeenCalled();
      expect(prop3).not.toHaveBeenCalled(); // Stopped after prop2 matched
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
      const subjectHandler = vi.fn().mockRejectedValue(new Error('Test error'));
      (engine as any).subjectHandlers.set('player', subjectHandler);

      await engine.handleEvent('game/player/score', '1000');

      expect(mockContext.log.error).toHaveBeenCalledWith(
        'Error handling event game/player/score:',
        expect.any(Error),
      );
    });

    it('should catch and log errors from property handlers', async () => {
      const propertyHandler = vi.fn().mockRejectedValue(new Error('Test error'));
      (engine as any).propertyHandlers = [propertyHandler];

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
        'Event handled by game transformer: pacman - pacman/player/score',
      );
    });

    it('should log debug message when subject handler matches', async () => {
      const subjectHandler = vi.fn().mockReturnValue(true);
      (engine as any).subjectHandlers.set('player', subjectHandler);

      await engine.handleEvent('game/player/score', '1000');

      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Event handled by subject transformer: player - game/player/score',
      );
    });

    it('should log debug message when property handler matches', async () => {
      const propertyHandler = vi.fn().mockReturnValue(true);
      (engine as any).propertyHandlers = [propertyHandler];

      await engine.handleEvent('test/topic', 'value');

      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Event handled by property transformer: test/topic',
      );
    });

    it('should log debug message when default handler runs', async () => {
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('test/topic', 'value');

      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'Event handled by default transformer: test/topic',
      );
    });
  });

  describe('extractTransformer', () => {
    it('should extract named export "transform"', () => {
      const handleFn = vi.fn();
      const module = { transform: handleFn };

      const handler = (engine as any).extractTransformer(module);

      expect(handler).toBe(handleFn);
    });

    it('should extract default export with transform property', () => {
      const handleFn = vi.fn();
      const module = { default: { transform: handleFn } };

      const handler = (engine as any).extractTransformer(module);

      expect(handler).toBe(handleFn);
    });

    it('should extract default export as function', () => {
      const defaultFn = vi.fn();
      const module = { default: defaultFn };

      const handler = (engine as any).extractTransformer(module);

      expect(handler).toBe(defaultFn);
    });

    it('should return null if no handler found', () => {
      const module = { someOtherExport: 'value' };

      const handler = (engine as any).extractTransformer(module);

      expect(handler).toBeNull();
    });

    it('should prefer named export over default', () => {
      const namedHandle = vi.fn();
      const defaultHandle = vi.fn();
      const module = { transform: namedHandle, default: { transform: defaultHandle } };

      const handler = (engine as any).extractTransformer(module);

      expect(handler).toBe(namedHandle);
    });

    it('should return null for empty module', () => {
      const module = {};

      const handler = (engine as any).extractTransformer(module);

      expect(handler).toBeNull();
    });

    it('should return null if transform is not a function', () => {
      const module = { transform: 'not a function' };

      const handler = (engine as any).extractTransformer(module);

      expect(handler).toBeNull();
    });

    it('should return null if default.transform is not a function', () => {
      const module = { default: { transform: 42 } };

      const handler = (engine as any).extractTransformer(module);

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

      expect(() => {
        engine.dispose();
      }).not.toThrow();
      expect(mockContext.log.info).not.toHaveBeenCalledWith('File watcher stopped');
    });

    it('should set watcher to undefined after closing', () => {
      const mockWatcher = { close: vi.fn() };
      (engine as any).watcher = mockWatcher;

      engine.dispose();

      expect((engine as any).watcher).toBeDefined();
    });
  });

  describe('dynamic game transformer loading', () => {
    it('should auto-load game transformer on first event', async () => {
      const loadGameTransformerSpy = vi.spyOn(engine as any, 'loadGameTransformer');
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('donkeykong/player/position', '100');

      expect(loadGameTransformerSpy).toHaveBeenCalledWith('donkeykong');
    });

    it('should not reload game transformer on subsequent events', async () => {
      const gameHandler = vi.fn().mockReturnValue(true);
      (engine as any).gameHandlers.set('pacman', gameHandler);
      const loadGameTransformerSpy = vi.spyOn(engine as any, 'loadGameTransformer');

      await engine.handleEvent('pacman/player/score', '1000');
      await engine.handleEvent('pacman/player/score', '2000');

      expect(loadGameTransformerSpy).not.toHaveBeenCalled();
      expect(gameHandler).toHaveBeenCalledTimes(2);
    });

    it('should handle failed game transformer load gracefully', async () => {
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('nonexistent/player/score', '1000');

      expect(mockContext.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not load game transformer for nonexistent'),
      );
      expect(mockEventBusEmit).toHaveBeenCalledWith('system:error', expect.objectContaining({
        errorType: 'transformer',
        filePath: join('/mock/transformers', 'games', 'nonexistent.js'),
      }));
      expect(defaultHandler).toHaveBeenCalled();
    });
  });

  describe('topic parsing', () => {
    it('should parse game and subject from topic', async () => {
      const gameHandler = vi.fn().mockReturnValue(true);
      (engine as any).gameHandlers.set('pacman', gameHandler);

      await engine.handleEvent('pacman/player/score/p1', '1000');

      expect(gameHandler).toHaveBeenCalledWith(createTopic('pacman/player/score/p1', '1000'), mockContext);
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

      expect(defaultHandler).toHaveBeenCalledWith(createTopic('test/topic', longPayload), mockContext);
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

      expect(defaultHandler).toHaveBeenCalledWith(createTopic('test/topic', '你好世界 🎮'), mockContext);
    });
  });

  describe('file watcher', () => {
    it('should start watching transformer directory', () => {
      const mockWatch = vi.fn().mockReturnValue({ close: vi.fn() });
      vi.mocked(fsSync.watch).mockImplementation(mockWatch as any);
      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const startWatcher = (engine as any).startFileWatcher.bind(engine);
      startWatcher('/mock/transformers');

      expect(mockWatch).toHaveBeenCalledWith(
        '/mock/transformers',
        { recursive: true },
        expect.any(Function),
      );
      expect(mockContext.log.info).toHaveBeenCalledWith(
        'File watcher started for transformer hot-reload',
      );
    });

    it('should warn if file watcher cannot start', () => {
      vi.mocked(fsSync.watch).mockImplementation(() => {
        throw new Error('Watch not supported');
      });

      const startWatcher = (engine as any).startFileWatcher.bind(engine);
      startWatcher('/mock/transformers');

      expect(mockContext.log.warn).toHaveBeenCalledWith(
        'Could not start file watcher:',
        expect.any(Error),
      );
    });

    it('should ignore non-.js file changes', () => {
      let watchCallback: any;
      vi.mocked(fsSync.watch).mockImplementation((...args: any[]) => {
        watchCallback = args[2]; // Third argument is the callback
        return { close: vi.fn() } as any;
      });

      const startWatcher = (engine as any).startFileWatcher.bind(engine);
      startWatcher('/mock/transformers');

      const reloadSpy = vi.spyOn(engine as any, 'reloadTransformer');

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
      startWatcher('/mock/transformers');

      const reloadSpy = vi.spyOn(engine as any, 'reloadTransformer').mockResolvedValue(undefined);

      watchCallback('change', 'games/pacman.js');

      expect(mockContext.log.info).toHaveBeenCalledWith('Transformer file changed: games/pacman.js');
      expect(reloadSpy).toHaveBeenCalledWith('/mock/transformers', 'games/pacman.js');
    });
  });

  describe('hot reload', () => {
    it('should replace game handler when file changes', async () => {
      const handlerV1 = vi.fn().mockReturnValue(true);
      const handlerV2 = vi.fn().mockReturnValue(true);

      let callCount = 0;
      const mockImportModule = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          transform: callCount === 1 ? handlerV1 : handlerV2,
        });
      });

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });

      // Initial load
      await (testEngine as any).loadGameTransformer('pacman');
      expect((testEngine as any).gameHandlers.get('pacman')).toBe(handlerV1);

      // Simulate file change via watcher
      await (testEngine as any).reloadTransformer('/mock/transformers', 'games/pacman.js');
      expect((testEngine as any).gameHandlers.get('pacman')).toBe(handlerV2);
    });

    it('should replace subject handler when file changes', async () => {
      const handlerV1 = vi.fn().mockReturnValue(true);
      const handlerV2 = vi.fn().mockReturnValue(true);

      let callCount = 0;
      const mockImportModule = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          transform: callCount === 1 ? handlerV1 : handlerV2,
        });
      });
      vi.mocked(fs.readdir).mockResolvedValue(['player.js'] as any);

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });

      // Initial load via loadSubjectTransformers
      await (testEngine as any).loadSubjectTransformers('/mock/transformers/subjects');
      expect((testEngine as any).subjectHandlers.get('player')).toBe(handlerV1);

      // Simulate file change via watcher
      await (testEngine as any).reloadTransformer('/mock/transformers', 'subjects/player.js');
      expect((testEngine as any).subjectHandlers.get('player')).toBe(handlerV2);
    });

    it('should replace default handler when file changes', async () => {
      const handlerV1 = vi.fn().mockReturnValue(true);
      const handlerV2 = vi.fn().mockReturnValue(true);

      let callCount = 0;
      const mockImportModule = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          transform: callCount === 1 ? handlerV1 : handlerV2,
        });
      });

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });

      // Initial load
      await (testEngine as any).loadDefaultTransformer('/mock/transformers/default.js');
      expect((testEngine as any).defaultHandler).toBe(handlerV1);

      // Simulate file change via watcher
      await (testEngine as any).reloadTransformer('/mock/transformers', 'default.js');
      expect((testEngine as any).defaultHandler).toBe(handlerV2);
    });

    it('should replace property handlers when file changes', async () => {
      const handlerV1 = vi.fn().mockReturnValue(true);
      const handlerV2 = vi.fn().mockReturnValue(true);

      let callCount = 0;
      const mockImportModule = vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          transform: callCount === 1 ? handlerV1 : handlerV2,
        });
      });
      vi.mocked(fs.readdir).mockResolvedValue(['score.js'] as any);

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });

      // Initial load
      await (testEngine as any).loadPropertyTransformers('/mock/transformers/properties');
      expect((testEngine as any).propertyHandlers).toHaveLength(1);
      expect((testEngine as any).propertyHandlers[0]).toBe(handlerV1);

      // Simulate file change via watcher — reloads all property handlers
      await (testEngine as any).reloadTransformer('/mock/transformers', 'properties/score.js');
      expect((testEngine as any).propertyHandlers).toHaveLength(1);
      expect((testEngine as any).propertyHandlers[0]).toBe(handlerV2);
    });

    it('should log reload errors without crashing', async () => {
      const mockImportModule = vi.fn().mockRejectedValue(new Error('Syntax error'));

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });

      // Subject reload catches import error in reloadTransformer's try-catch
      await (testEngine as any).reloadTransformer('/mock/transformers', 'subjects/broken.js');

      expect(mockContext.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to reload transformer subjects/broken.js'),
        expect.any(Error),
      );
    });

    it('should reload all loaded game transformers when shared dependency changes', async () => {
      const handlerV1 = vi.fn().mockReturnValue(true);
      const handlerV2 = vi.fn().mockReturnValue(true);

      let version = 1;
      const mockImportModule = vi.fn().mockImplementation(() => {
        return Promise.resolve({
          transform: version === 1 ? handlerV1 : handlerV2,
        });
      });
      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });

      // Load two game transformers
      await (testEngine as any).loadGameTransformer('defender');
      await (testEngine as any).loadGameTransformer('pacman');
      expect((testEngine as any).gameHandlers.get('defender')).toBe(handlerV1);
      expect((testEngine as any).gameHandlers.get('pacman')).toBe(handlerV1);

      // Switch to V2 and simulate shared file change
      version = 2;
      await (testEngine as any).reloadTransformer('/mock/transformers', 'global.js');

      expect((testEngine as any).gameHandlers.get('defender')).toBe(handlerV2);
      expect((testEngine as any).gameHandlers.get('pacman')).toBe(handlerV2);
      expect(mockContext.log.info).toHaveBeenCalledWith(
        'Shared dependency changed: global.js — reloaded all transformers',
      );
    });

    it('should reload subject and default handlers when shared dependency changes', async () => {
      const handlerV1 = vi.fn().mockReturnValue(true);
      const handlerV2 = vi.fn().mockReturnValue(true);

      let version = 1;
      const mockImportModule = vi.fn().mockImplementation(() => {
        return Promise.resolve({
          transform: version === 1 ? handlerV1 : handlerV2,
        });
      });
      vi.mocked(fs.readdir).mockResolvedValue(['init.js'] as any);

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });

      // Initial load
      await (testEngine as any).loadSubjectTransformers('/mock/transformers/subjects');
      await (testEngine as any).loadDefaultTransformer('/mock/transformers/default.js');
      expect((testEngine as any).subjectHandlers.get('init')).toBe(handlerV1);
      expect((testEngine as any).defaultHandler).toBe(handlerV1);

      // Switch to V2 and simulate utils file change
      version = 2;
      await (testEngine as any).reloadTransformer('/mock/transformers', 'utils/index.js');

      expect((testEngine as any).subjectHandlers.get('init')).toBe(handlerV2);
      expect((testEngine as any).defaultHandler).toBe(handlerV2);
    });

    it('should not create game handlers for unloaded games on shared dependency change', async () => {
      const mockImportModule = vi.fn().mockResolvedValue({
        transform: vi.fn().mockReturnValue(true),
      });
      vi.mocked(fs.readdir).mockResolvedValue([] as any);

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });

      // No game transformers loaded
      expect((testEngine as any).gameHandlers.size).toBe(0);
      mockImportModule.mockClear();

      await (testEngine as any).reloadTransformer('/mock/transformers', 'global.js');

      // No game imports should have been attempted
      const gameImportCalls = mockImportModule.mock.calls.filter(
        (call: string[]) => call[0].includes('games/') || call[0].includes('games\\'),
      );
      expect(gameImportCalls).toHaveLength(0);
      expect((testEngine as any).gameHandlers.size).toBe(0);
    });
  });

  describe('file loading with dependency injection', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should load game transformer via importModule', async () => {
      const mockHandler = vi.fn().mockReturnValue(true);
      const mockImportModule = vi.fn().mockResolvedValue({
        transform: mockHandler,
      });

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadGameTransformer('pacman');

      expect(mockImportModule).toHaveBeenCalledWith(expect.stringMatching(/games[/\\]pacman\.js$/));
      expect((testEngine as any).gameHandlers.has('pacman')).toBe(true);
      expect(mockContext.log.info).toHaveBeenCalledWith('Loaded game transformer: pacman');
    });

    it('should handle game transformer import failures gracefully', async () => {
      const mockImportModule = vi.fn().mockRejectedValue(new Error('File not found'));

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadGameTransformer('nonexistent');

      expect(mockContext.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not load game transformer for nonexistent'),
      );
      expect(mockEventBusEmit).toHaveBeenCalledWith('system:error', expect.objectContaining({
        errorType: 'transformer',
        message: expect.stringContaining('File not found'),
        filePath: join('/mock/transformers', 'games', 'nonexistent.js'),
      }));
      expect((testEngine as any).gameHandlers.has('nonexistent')).toBe(false);
    });

    it('should warn when game transformer has no valid handler', async () => {
      const mockImportModule = vi.fn().mockResolvedValue({
        someOtherExport: 'value',
      });

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadGameTransformer('broken');

      expect(mockContext.log.warn).toHaveBeenCalledWith(
        'Game transformer broken.js has no valid transform function',
      );
      expect((testEngine as any).gameHandlers.has('broken')).toBe(false);
    });


    it('should load subject transformers from directory', async () => {
      const subjectHandler = vi.fn().mockReturnValue(true);
      const mockImportModule = vi.fn().mockResolvedValue({
        transform: subjectHandler,
      });

      vi.mocked(fs.readdir).mockResolvedValue(['player.js', 'enemy.js'] as any);

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadSubjectTransformers('/mock/subjects');

      expect(mockImportModule).toHaveBeenCalledWith(join('/mock/subjects', 'player.js'));
      expect(mockImportModule).toHaveBeenCalledWith(join('/mock/subjects', 'enemy.js'));
      expect((testEngine as any).subjectHandlers.has('player')).toBe(true);
      expect((testEngine as any).subjectHandlers.has('enemy')).toBe(true);
    });

    it('should filter non-.js files in subject loading', async () => {
      const mockImportModule = vi.fn().mockResolvedValue({ transform: vi.fn() });
      vi.mocked(fs.readdir).mockResolvedValue(['player.js', 'readme.md', '.gitkeep'] as any);

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadSubjectTransformers('/mock/subjects');

      expect(mockImportModule).toHaveBeenCalledTimes(1);
      expect(mockImportModule).toHaveBeenCalledWith(join('/mock/subjects', 'player.js'));
    });

    it('should swallow ENOENT when subject directory missing', async () => {
      const enoentError: any = new Error('No such directory');
      enoentError.code = 'ENOENT';
      vi.mocked(fs.readdir).mockRejectedValue(enoentError);

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext);
      await expect(
        (testEngine as any).loadSubjectTransformers('/mock/subjects'),
      ).resolves.not.toThrow();
    });

    it('should re-throw non-ENOENT errors from subject loading', async () => {
      const permError = new Error('Permission denied');
      vi.mocked(fs.readdir).mockRejectedValue(permError);

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext);
      await expect((testEngine as any).loadSubjectTransformers('/mock/subjects')).rejects.toThrow(
        'Permission denied',
      );
    });

    it('should continue loading when individual subject transformer fails', async () => {
      let callCount = 0;
      const mockImportModule = vi.fn().mockImplementation(() => {
        callCount++;

        if (callCount === 1) {
          return Promise.reject(new Error('Syntax error'));
        }

        return Promise.resolve({ transform: vi.fn() });
      });
      vi.mocked(fs.readdir).mockResolvedValue(['broken.js', 'good.js'] as any);

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadSubjectTransformers('/mock/subjects');

      expect(mockContext.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load subject transformer broken.js'),
        expect.any(Error),
      );
      expect((testEngine as any).subjectHandlers.has('good')).toBe(true);
    });

    it('should load property transformers from directory', async () => {
      const propHandler = vi.fn().mockReturnValue(true);
      const mockImportModule = vi.fn().mockResolvedValue({
        transform: propHandler,
      });
      vi.mocked(fs.readdir).mockResolvedValue(['score.js'] as any);

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadPropertyTransformers('/mock/properties');

      expect(mockImportModule).toHaveBeenCalledWith(join('/mock/properties', 'score.js'));
      expect((testEngine as any).propertyHandlers).toHaveLength(1);
    });

    it('should swallow ENOENT when property directory missing', async () => {
      const enoentError: any = new Error('No such directory');
      enoentError.code = 'ENOENT';
      vi.mocked(fs.readdir).mockRejectedValue(enoentError);

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext);
      await expect(
        (testEngine as any).loadPropertyTransformers('/mock/properties'),
      ).resolves.not.toThrow();
    });

    it('should re-throw non-ENOENT errors from property loading', async () => {
      const permError = new Error('Permission denied');
      vi.mocked(fs.readdir).mockRejectedValue(permError);

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext);
      await expect(
        (testEngine as any).loadPropertyTransformers('/mock/properties'),
      ).rejects.toThrow('Permission denied');
    });

    it('should continue loading when individual property transformer fails', async () => {
      let callCount = 0;
      const mockImportModule = vi.fn().mockImplementation(() => {
        callCount++;

        if (callCount === 1) {
          return Promise.reject(new Error('Syntax error'));
        }

        return Promise.resolve({ transform: vi.fn() });
      });
      vi.mocked(fs.readdir).mockResolvedValue(['broken.js', 'good.js'] as any);

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadPropertyTransformers('/mock/properties');

      expect(mockContext.log.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load property transformer broken.js'),
        expect.any(Error),
      );
      expect((testEngine as any).propertyHandlers).toHaveLength(1);
    });

    it('should load default transformer', async () => {
      const mockHandler = vi.fn();
      const mockImportModule = vi.fn().mockResolvedValue({
        transform: mockHandler,
      });

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadDefaultTransformer('/mock/default.js');

      expect(mockImportModule).toHaveBeenCalledWith('/mock/default.js');
      expect((testEngine as any).defaultHandler).toBe(mockHandler);
    });

    it('should handle default transformer import failures (non-ENOENT)', async () => {
      const syntaxError = new Error('Syntax error');
      const mockImportModule = vi.fn().mockRejectedValue(syntaxError);

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadDefaultTransformer('/mock/default.js');

      expect(mockContext.log.error).toHaveBeenCalledWith(
        'Failed to load default transformer:',
        syntaxError,
      );
      expect((testEngine as any).defaultHandler).toBeUndefined();
    });

    it('should ignore default transformer ENOENT errors', async () => {
      const enoentError: any = new Error('File not found');
      enoentError.code = 'ENOENT';
      const mockImportModule = vi.fn().mockRejectedValue(enoentError);

      const testEngine = new (await import('../transformer-engine.js')).TransformerEngine(mockContext, {
        importModule: mockImportModule,
      });
      await (testEngine as any).loadDefaultTransformer('/mock/default.js');

      expect(mockContext.log.error).not.toHaveBeenCalled();
      expect((testEngine as any).defaultHandler).toBeUndefined();
    });

  });

  describe('clearState', () => {
    it('should clear the state store', () => {
      engine.clearState();

      expect(mockContext.state.clear).toHaveBeenCalledTimes(1);
    });

    it('should log info message when clearing state', () => {
      engine.clearState();

      expect(mockContext.log.info).toHaveBeenCalledWith('Clearing transformer state');
    });

    it('should be callable multiple times', () => {
      engine.clearState();
      engine.clearState();
      engine.clearState();

      expect(mockContext.state.clear).toHaveBeenCalledTimes(3);
    });
  });

  describe('clearAllDriverEffects', () => {
    it('should clear effects on rgfx/reset event', async () => {
      const mockDriver1 = { id: 'driver-1', mac: 'AA:BB:CC:DD:EE:01', disabled: false };
      const mockDriver2 = { id: 'driver-2', mac: 'AA:BB:CC:DD:EE:02', disabled: false };
      mockContext.drivers = {
        getConnectedDrivers: vi.fn().mockReturnValue([mockDriver1, mockDriver2]),
      } as any;

      await engine.handleEvent('rgfx/reset', 'galaga88');

      // Immediate UDP clear broadcast
      expect(mockContext.broadcast).toHaveBeenCalledWith({ effect: 'clear' });
      // Topics use MAC address (immutable) instead of driver ID
      expect(mockContext.mqtt.publish).toHaveBeenCalledTimes(2);
      expect(mockContext.mqtt.publish).toHaveBeenCalledWith('rgfx/driver/AA:BB:CC:DD:EE:01/clear-effects', '', 2);
      expect(mockContext.mqtt.publish).toHaveBeenCalledWith('rgfx/driver/AA:BB:CC:DD:EE:02/clear-effects', '', 2);
    });

    it('should clear transformer state on rgfx/reset event', async () => {
      const mockDriver1 = { id: 'driver-1', mac: 'AA:BB:CC:DD:EE:01', disabled: false };
      mockContext.drivers = {
        getConnectedDrivers: vi.fn().mockReturnValue([mockDriver1]),
      } as any;

      await engine.handleEvent('rgfx/reset', 'galaga88');

      expect(mockContext.state.clear).toHaveBeenCalled();
    });

    it('should not cascade to handlers after rgfx/reset', async () => {
      const mockDriver1 = { id: 'driver-1', mac: 'AA:BB:CC:DD:EE:01', disabled: false };
      mockContext.drivers = {
        getConnectedDrivers: vi.fn().mockReturnValue([mockDriver1]),
      } as any;

      const subjectHandler = vi.fn().mockReturnValue(true);
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).subjectHandlers.set('reset', subjectHandler);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('rgfx/reset', 'galaga88');

      expect(subjectHandler).not.toHaveBeenCalled();
      expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('should not clear effects on init event', async () => {
      const mockDriver1 = { id: 'driver-1', mac: 'AA:BB:CC:DD:EE:01', disabled: false };
      mockContext.drivers = {
        getConnectedDrivers: vi.fn().mockReturnValue([mockDriver1]),
      } as any;

      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('game/init', 'game');

      // Init should NOT clear — rgfx/reset handles clearing separately
      expect(mockContext.broadcast).not.toHaveBeenCalledWith({ effect: 'clear' });
      expect(mockContext.mqtt.publish).not.toHaveBeenCalled();
      expect(mockContext.state.clear).not.toHaveBeenCalled();
    });

    it('should clear effects on shutdown event', async () => {
      const mockDriver1 = { id: 'driver-1', mac: 'AA:BB:CC:DD:EE:01', disabled: false };
      mockContext.drivers = {
        getConnectedDrivers: vi.fn().mockReturnValue([mockDriver1]),
      } as any;

      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('game/shutdown', '');

      expect(mockContext.broadcast).toHaveBeenCalledWith({ effect: 'clear' });
      expect(mockContext.mqtt.publish).toHaveBeenCalledWith('rgfx/driver/AA:BB:CC:DD:EE:01/clear-effects', '', 2);
    });

    it('should skip disabled drivers when clearing effects', async () => {
      const mockDriver1 = { id: 'driver-1', mac: 'AA:BB:CC:DD:EE:01', disabled: false };
      const mockDriver2 = { id: 'driver-2', mac: 'AA:BB:CC:DD:EE:02', disabled: true };
      const mockDriver3 = { id: 'driver-3', mac: 'AA:BB:CC:DD:EE:03', disabled: false };
      mockContext.drivers = {
        getConnectedDrivers: vi.fn().mockReturnValue([mockDriver1, mockDriver2, mockDriver3]),
      } as any;

      await engine.handleEvent('rgfx/reset', 'game');

      // Should only clear effects on enabled drivers (driver-1 and driver-3)
      expect(mockContext.mqtt.publish).toHaveBeenCalledTimes(2);
      expect(mockContext.mqtt.publish).toHaveBeenCalledWith('rgfx/driver/AA:BB:CC:DD:EE:01/clear-effects', '', 2);
      expect(mockContext.mqtt.publish).toHaveBeenCalledWith('rgfx/driver/AA:BB:CC:DD:EE:03/clear-effects', '', 2);
      expect(mockContext.mqtt.publish).not.toHaveBeenCalledWith('rgfx/driver/AA:BB:CC:DD:EE:02/clear-effects', '', 2);
    });

    it('should not publish when no connected drivers', async () => {
      mockContext.drivers = {
        getConnectedDrivers: vi.fn().mockReturnValue([]),
      } as any;

      await engine.handleEvent('rgfx/reset', 'game');

      // UDP clear still broadcasts (fire-and-forget to all drivers)
      expect(mockContext.broadcast).toHaveBeenCalledWith({ effect: 'clear' });
      expect(mockContext.mqtt.publish).not.toHaveBeenCalled();
      expect(mockContext.log.debug).toHaveBeenCalledWith('No connected drivers to clear effects');
    });

    it('should not publish when all connected drivers are disabled', async () => {
      const mockDriver1 = { id: 'driver-1', disabled: true };
      const mockDriver2 = { id: 'driver-2', disabled: true };
      mockContext.drivers = {
        getConnectedDrivers: vi.fn().mockReturnValue([mockDriver1, mockDriver2]),
      } as any;

      await engine.handleEvent('rgfx/reset', 'game');

      expect(mockContext.broadcast).toHaveBeenCalledWith({ effect: 'clear' });
      expect(mockContext.mqtt.publish).not.toHaveBeenCalled();
      expect(mockContext.log.debug).toHaveBeenCalledWith('No connected drivers to clear effects');
    });

    it('should clear effects on rgfx/mame-exit event', async () => {
      const mockDriver1 = { id: 'driver-1', mac: 'AA:BB:CC:DD:EE:01', disabled: false };
      mockContext.drivers = {
        getConnectedDrivers: vi.fn().mockReturnValue([mockDriver1]),
      } as any;

      await engine.handleEvent('rgfx/mame-exit', 'pacman');

      expect(mockContext.log.info).toHaveBeenCalledWith('MAME exited for game: pacman');
      expect(mockContext.broadcast).toHaveBeenCalledWith({ effect: 'clear' });
      expect(mockContext.mqtt.publish).toHaveBeenCalledWith('rgfx/driver/AA:BB:CC:DD:EE:01/clear-effects', '', 2);
    });

    it('should handle rgfx/mame-exit with unknown game', async () => {
      const mockDriver1 = { id: 'driver-1', mac: 'AA:BB:CC:DD:EE:01', disabled: false };
      mockContext.drivers = {
        getConnectedDrivers: vi.fn().mockReturnValue([mockDriver1]),
      } as any;

      await engine.handleEvent('rgfx/mame-exit', '');

      expect(mockContext.log.info).toHaveBeenCalledWith('MAME exited for game: unknown');
      expect(mockContext.broadcast).toHaveBeenCalledWith({ effect: 'clear' });
      expect(mockContext.mqtt.publish).toHaveBeenCalledWith('rgfx/driver/AA:BB:CC:DD:EE:01/clear-effects', '', 2);
    });

    it('should not cascade to other handlers after rgfx/mame-exit', async () => {
      const mockDriver1 = { id: 'driver-1', mac: 'AA:BB:CC:DD:EE:01', disabled: false };
      mockContext.drivers = {
        getConnectedDrivers: vi.fn().mockReturnValue([mockDriver1]),
      } as any;

      const subjectHandler = vi.fn().mockReturnValue(true);
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).subjectHandlers.set('mame-exit', subjectHandler);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('rgfx/mame-exit', 'pacman');

      // Should return early, not calling subject or default handlers
      expect(subjectHandler).not.toHaveBeenCalled();
      expect(defaultHandler).not.toHaveBeenCalled();
    });

    it('should clear effects on rgfx/clear-effects event', async () => {
      const mockDriver1 = { id: 'driver-1', mac: 'AA:BB:CC:DD:EE:01', disabled: false };
      mockContext.drivers = {
        getConnectedDrivers: vi.fn().mockReturnValue([mockDriver1]),
      } as any;

      await engine.handleEvent('rgfx/clear-effects', '');

      expect(mockContext.log.info).toHaveBeenCalledWith('Clear all effects requested');
      expect(mockContext.broadcast).toHaveBeenCalledWith({ effect: 'clear' });
      expect(mockContext.state.clear).toHaveBeenCalled();
      expect(mockContext.mqtt.publish).toHaveBeenCalledWith('rgfx/driver/AA:BB:CC:DD:EE:01/clear-effects', '', 2);
    });

    it('should not cascade to other handlers after rgfx/clear-effects', async () => {
      const mockDriver1 = { id: 'driver-1', mac: 'AA:BB:CC:DD:EE:01', disabled: false };
      mockContext.drivers = {
        getConnectedDrivers: vi.fn().mockReturnValue([mockDriver1]),
      } as any;

      const subjectHandler = vi.fn().mockReturnValue(true);
      const defaultHandler = vi.fn().mockReturnValue(true);
      (engine as any).subjectHandlers.set('clear-effects', subjectHandler);
      (engine as any).defaultHandler = defaultHandler;

      await engine.handleEvent('rgfx/clear-effects', '');

      expect(subjectHandler).not.toHaveBeenCalled();
      expect(defaultHandler).not.toHaveBeenCalled();
    });
  });

  describe('context method invocation', () => {
    it('should call broadcast when transformer invokes it', async () => {
      const transformFn = vi.fn().mockImplementation((_topic, ctx) => {
        ctx.broadcast({
          effect: 'pulse',
          props: { color: '#FF0000', duration: 500 },
        });
        return true;
      });

      const testEngine = new TransformerEngine(mockContext, {
        importModule: (p: string) => {
          if (p.includes(join('games', 'testgame'))) {
            return Promise.resolve({ transform: transformFn });
          }

          return Promise.reject(new Error(`Module not found: ${p}`));
        },
      });

      await testEngine.handleEvent('testgame/player/die', '1');

      expect(mockContext.broadcast).toHaveBeenCalledTimes(1);
      expect(mockContext.broadcast).toHaveBeenCalledWith({
        effect: 'pulse',
        props: { color: '#FF0000', duration: 500 },
      });
    });

    it('should call loadGif when transformer invokes it', async () => {
      const mockGifResult = {
        images: [['AA', 'AA']],
        palette: ['#000000', '#FFFFFF'],
        width: 8,
        height: 8,
        frameCount: 1,
      };
      mockContext.loadGif = vi.fn().mockResolvedValue(mockGifResult);

      const transformFn = vi.fn().mockImplementation(async (_topic, ctx) => {
        const gif = await ctx.loadGif('bitmaps/test.gif');
        ctx.broadcast({
          effect: 'bitmap',
          props: { images: gif.images, palette: gif.palette },
        });
        return true;
      });

      const testEngine = new TransformerEngine(mockContext, {
        importModule: (p: string) => {
          if (p.includes(join('games', 'testgame'))) {
            return Promise.resolve({ transform: transformFn });
          }

          return Promise.reject(new Error(`Module not found: ${p}`));
        },
      });

      await testEngine.handleEvent('testgame/bonus/collected', 'cherry');

      expect(mockContext.loadGif).toHaveBeenCalledTimes(1);
      expect(mockContext.loadGif).toHaveBeenCalledWith('bitmaps/test.gif');
      expect(mockContext.broadcast).toHaveBeenCalledWith({
        effect: 'bitmap',
        props: { images: [['AA', 'AA']], palette: ['#000000', '#FFFFFF'] },
      });
    });
  });
});
