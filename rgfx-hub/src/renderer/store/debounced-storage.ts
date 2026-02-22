import { debounce } from 'lodash-es';
import type { StateStorage } from 'zustand/middleware';

/**
 * Wraps localStorage with a debounced setItem to batch rapid writes.
 * getItem and removeItem pass through immediately.
 */
export function createDebouncedStorage(delay = 500): StateStorage {
  const debouncedSetItem = debounce(
    (name: string, value: string) => {
      localStorage.setItem(name, value);
    },
    delay,
  );

  return {
    getItem: (name: string) => localStorage.getItem(name),
    setItem: (name: string, value: string) => {
      debouncedSetItem(name, value);
    },
    removeItem: (name: string) => {
      localStorage.removeItem(name);
    },
  };
}
