/**
 * Unit tests for StateStoreImpl
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StateStoreImpl } from '../state-store';

describe('StateStoreImpl', () => {
  let store: StateStoreImpl;

  beforeEach(() => {
    store = new StateStoreImpl();
  });

  describe('set and get', () => {
    it('should store and retrieve string values', () => {
      store.set('name', 'Pac-Man');
      expect(store.get<string>('name')).toBe('Pac-Man');
    });

    it('should store and retrieve number values', () => {
      store.set('score', 12450);
      expect(store.get<number>('score')).toBe(12450);
    });

    it('should store and retrieve boolean values', () => {
      store.set('powerup_active', true);
      expect(store.get<boolean>('powerup_active')).toBe(true);
    });

    it('should store and retrieve object values', () => {
      const gameState = { level: 3, lives: 2, score: 5000 };
      store.set('game_state', gameState);
      expect(store.get<typeof gameState>('game_state')).toEqual(gameState);
    });

    it('should store and retrieve array values', () => {
      const ghosts = ['red', 'pink', 'cyan', 'orange'];
      store.set('ghosts', ghosts);
      expect(store.get<string[]>('ghosts')).toEqual(ghosts);
    });

    it('should return undefined for non-existent keys', () => {
      expect(store.get('nonexistent')).toBeUndefined();
    });

    it('should overwrite existing values', () => {
      store.set('score', 1000);
      store.set('score', 2000);
      expect(store.get<number>('score')).toBe(2000);
    });

    it('should handle null values', () => {
      store.set('nullable', null);
      expect(store.get('nullable')).toBeNull();
    });

    it('should handle undefined values', () => {
      store.set('optional', undefined);
      expect(store.get('optional')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for existing keys', () => {
      store.set('exists', 'value');
      expect(store.has('exists')).toBe(true);
    });

    it('should return false for non-existent keys', () => {
      expect(store.has('does_not_exist')).toBe(false);
    });

    it('should return true for keys with undefined values', () => {
      store.set('optional', undefined);
      expect(store.has('optional')).toBe(true);
    });

    it('should return true for keys with null values', () => {
      store.set('nullable', null);
      expect(store.has('nullable')).toBe(true);
    });
  });

  describe('delete', () => {
    it('should delete existing keys', () => {
      store.set('temp', 'value');
      expect(store.has('temp')).toBe(true);
      store.delete('temp');
      expect(store.has('temp')).toBe(false);
    });

    it('should not throw when deleting non-existent keys', () => {
      expect(() => { store.delete('nonexistent'); }).not.toThrow();
    });

    it('should make deleted keys return undefined', () => {
      store.set('temp', 'value');
      store.delete('temp');
      expect(store.get('temp')).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all stored data', () => {
      store.set('key1', 'value1');
      store.set('key2', 'value2');
      store.set('key3', 'value3');

      expect(store.size).toBe(3);

      store.clear();

      expect(store.size).toBe(0);
      expect(store.has('key1')).toBe(false);
      expect(store.has('key2')).toBe(false);
      expect(store.has('key3')).toBe(false);
    });

    it('should allow setting new values after clear', () => {
      store.set('before', 'clear');
      store.clear();
      store.set('after', 'clear');

      expect(store.has('before')).toBe(false);
      expect(store.has('after')).toBe(true);
      expect(store.get<string>('after')).toBe('clear');
    });

    it('should not throw when clearing empty store', () => {
      expect(() => { store.clear(); }).not.toThrow();
    });
  });

  describe('size', () => {
    it('should return 0 for empty store', () => {
      expect(store.size).toBe(0);
    });

    it('should return correct count after adding items', () => {
      store.set('key1', 'value1');
      expect(store.size).toBe(1);

      store.set('key2', 'value2');
      expect(store.size).toBe(2);

      store.set('key3', 'value3');
      expect(store.size).toBe(3);
    });

    it('should not increment when overwriting existing key', () => {
      store.set('key', 'value1');
      expect(store.size).toBe(1);

      store.set('key', 'value2');
      expect(store.size).toBe(1);
    });

    it('should decrement when deleting items', () => {
      store.set('key1', 'value1');
      store.set('key2', 'value2');
      expect(store.size).toBe(2);

      store.delete('key1');
      expect(store.size).toBe(1);
    });
  });

  describe('type safety', () => {
    it('should work with complex nested types', () => {
      interface GameState {
        player: {
          score: number;
          lives: number;
          powerups: string[];
        };
        enemies: {
          id: string;
          state: number;
        }[];
      }

      const complexState: GameState = {
        player: {
          score: 12450,
          lives: 3,
          powerups: ['star', 'mushroom'],
        },
        enemies: [
          { id: 'goomba1', state: 1 },
          { id: 'koopa1', state: 2 },
        ],
      };

      store.set('complex_state', complexState);
      const retrieved = store.get<GameState>('complex_state');

      expect(retrieved).toEqual(complexState);
      expect(retrieved?.player.score).toBe(12450);
      expect(retrieved?.enemies).toHaveLength(2);
    });
  });

  describe('isolation', () => {
    it('should isolate multiple store instances', () => {
      const store1 = new StateStoreImpl();
      const store2 = new StateStoreImpl();

      store1.set('shared_key', 'store1_value');
      store2.set('shared_key', 'store2_value');

      expect(store1.get('shared_key')).toBe('store1_value');
      expect(store2.get('shared_key')).toBe('store2_value');
    });

    it('should not affect other instances when clearing', () => {
      const store1 = new StateStoreImpl();
      const store2 = new StateStoreImpl();

      store1.set('key', 'value1');
      store2.set('key', 'value2');

      store1.clear();

      expect(store1.has('key')).toBe(false);
      expect(store2.has('key')).toBe(true);
    });
  });
});
