import { useState, useEffect } from 'react';

interface UsePendingWithTimeoutOptions {
  /** Timeout in milliseconds before auto-clearing pending state (default: 5000) */
  timeoutMs?: number;
  /** Dependencies that will clear pending state when they change */
  clearOnChange?: unknown[];
}

interface UsePendingWithTimeoutReturn {
  pending: boolean;
  setPending: (value: boolean) => void;
}

/**
 * Hook for managing pending state with automatic timeout and dependency-based clearing.
 * Useful for async operations that may not complete reliably (e.g., awaiting device state changes).
 *
 * @example
 * const { pending, setPending } = usePendingWithTimeout({
 *   timeoutMs: 5000,
 *   clearOnChange: [driver.testActive, driver.state],
 * });
 */
export function usePendingWithTimeout(
  options: UsePendingWithTimeoutOptions = {},
): UsePendingWithTimeoutReturn {
  const { timeoutMs = 5000, clearOnChange = [] } = options;
  const [pending, setPending] = useState(false);

  // Clear pending state when dependencies change
  useEffect(() => {
    setPending(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, clearOnChange);

  // Timeout to auto-clear pending state if no response received
  useEffect(() => {
    if (!pending) {
      return;
    }

    const timer = setTimeout(() => {
      setPending(false);
    }, timeoutMs);

    return () => {
      clearTimeout(timer);
    };
  }, [pending, timeoutMs]);

  return { pending, setPending };
}
