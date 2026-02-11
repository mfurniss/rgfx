/**
 * In-memory state store for event transformers
 *
 * Provides type-safe key-value storage for transformers to persist data across
 * events. Useful for tracking game state, debouncing, rate limiting, etc.
 *
 * Phase 1: Simple in-memory Map storage
 * Phase 2: Optional persistence to disk with auto-save
 */

import type { StateStore } from '../types/transformer-types';

/**
 * Simple Map-based state store implementation
 *
 * Data is stored in memory only and will be lost on restart.
 * Use for temporary state tracking that doesn't need persistence.
 */
export class StateStoreImpl implements StateStore {
  private store = new Map<string, unknown>();

  get(key: string): unknown {
    return this.store.get(key);
  }

  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  has(key: string): boolean {
    return this.store.has(key);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }
}
