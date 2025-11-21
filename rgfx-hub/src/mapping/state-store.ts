/**
 * In-memory state store for event mappers
 *
 * Provides type-safe key-value storage for mappers to persist data across
 * events. Useful for tracking game state, debouncing, rate limiting, etc.
 *
 * Phase 1: Simple in-memory Map storage
 * Phase 2: Optional persistence to disk with auto-save
 */

import type { StateStore } from '../types/mapping-types';

/**
 * Simple Map-based state store implementation
 *
 * Data is stored in memory only and will be lost on restart.
 * Use for temporary state tracking that doesn't need persistence.
 */
export class StateStoreImpl implements StateStore {
  private store = new Map<string, unknown>();

  /**
   * Get value by key
   * @param key Storage key
   * @returns Stored value or undefined if not found
   */
  get(key: string): unknown {
    return this.store.get(key);
  }

  /**
   * Set value for key
   * @param key Storage key
   * @param value Value to store
   */
  set(key: string, value: unknown): void {
    this.store.set(key, value);
  }

  /**
   * Check if key exists in store
   * @param key Storage key
   * @returns true if key exists, false otherwise
   */
  has(key: string): boolean {
    return this.store.has(key);
  }

  /**
   * Delete key from store
   * @param key Storage key to delete
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all stored data
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get number of keys in store (for debugging/testing)
   */
  get size(): number {
    return this.store.size;
  }
}
