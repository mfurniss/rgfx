export interface EventStats {
  getCount(): number;
  increment(): void;
  reset(): void;
}

/**
 * Creates an event statistics tracker for counting processed events.
 */
export function createEventStats(): EventStats {
  let count = 0;

  return {
    getCount: () => count,

    increment(): void {
      count++;
    },

    reset(): void {
      count = 0;
    },
  };
}
