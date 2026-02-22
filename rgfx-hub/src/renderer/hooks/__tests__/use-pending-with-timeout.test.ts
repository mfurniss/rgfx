import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePendingWithTimeout } from '../use-pending-with-timeout';

describe('usePendingWithTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should initialize with pending false', () => {
      const { result } = renderHook(() => usePendingWithTimeout());

      expect(result.current.pending).toBe(false);
    });

    it('should provide a setPending function', () => {
      const { result } = renderHook(() => usePendingWithTimeout());

      expect(typeof result.current.setPending).toBe('function');
    });
  });

  describe('setPending', () => {
    it('should set pending to true', () => {
      const { result } = renderHook(() => usePendingWithTimeout());

      act(() => {
        result.current.setPending(true);
      });

      expect(result.current.pending).toBe(true);
    });

    it('should set pending to false', () => {
      const { result } = renderHook(() => usePendingWithTimeout());

      act(() => {
        result.current.setPending(true);
      });

      act(() => {
        result.current.setPending(false);
      });

      expect(result.current.pending).toBe(false);
    });
  });

  describe('timeout behavior', () => {
    it('should auto-clear pending after default timeout (5000ms)', () => {
      const { result } = renderHook(() => usePendingWithTimeout());

      act(() => {
        result.current.setPending(true);
      });

      expect(result.current.pending).toBe(true);

      act(() => {
        vi.advanceTimersByTime(4999);
      });

      expect(result.current.pending).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(result.current.pending).toBe(false);
    });

    it('should auto-clear pending after custom timeout', () => {
      const { result } = renderHook(() =>
        usePendingWithTimeout({ timeoutMs: 2000 }),
      );

      act(() => {
        result.current.setPending(true);
      });

      expect(result.current.pending).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1999);
      });

      expect(result.current.pending).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(result.current.pending).toBe(false);
    });

    it('should not start timeout when pending is false', () => {
      const { result } = renderHook(() =>
        usePendingWithTimeout({ timeoutMs: 1000 }),
      );

      // Advance time without setting pending
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.pending).toBe(false);
    });

    it('should clear timeout when pending is manually set to false', () => {
      const { result } = renderHook(() =>
        usePendingWithTimeout({ timeoutMs: 5000 }),
      );

      act(() => {
        result.current.setPending(true);
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      act(() => {
        result.current.setPending(false);
      });

      expect(result.current.pending).toBe(false);

      // Advance past original timeout - should stay false
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.pending).toBe(false);
    });

    it('should restart timeout when pending is set to true again', () => {
      const { result } = renderHook(() =>
        usePendingWithTimeout({ timeoutMs: 3000 }),
      );

      act(() => {
        result.current.setPending(true);
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      // Set to false and then true again
      act(() => {
        result.current.setPending(false);
      });

      act(() => {
        result.current.setPending(true);
      });

      // New timeout should start from here
      act(() => {
        vi.advanceTimersByTime(2999);
      });

      expect(result.current.pending).toBe(true);

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(result.current.pending).toBe(false);
    });
  });

  describe('clearOnChange behavior', () => {
    it('should clear pending when dependency changes', () => {
      let dep = 'initial';
      const { result, rerender } = renderHook(() =>
        usePendingWithTimeout({ clearOnChange: [dep] }),
      );

      act(() => {
        result.current.setPending(true);
      });

      expect(result.current.pending).toBe(true);

      // Change dependency
      dep = 'changed';
      rerender();

      expect(result.current.pending).toBe(false);
    });

    it('should clear pending when any dependency in array changes', () => {
      const dep1 = 'a';
      let dep2 = 'b';
      const { result, rerender } = renderHook(() =>
        usePendingWithTimeout({ clearOnChange: [dep1, dep2] }),
      );

      act(() => {
        result.current.setPending(true);
      });

      expect(result.current.pending).toBe(true);

      // Change only second dependency
      dep2 = 'c';
      rerender();

      expect(result.current.pending).toBe(false);
    });

    it('should not clear pending when dependencies remain the same', () => {
      const dep = 'stable';
      const { result, rerender } = renderHook(() =>
        usePendingWithTimeout({ clearOnChange: [dep] }),
      );

      act(() => {
        result.current.setPending(true);
      });

      expect(result.current.pending).toBe(true);

      // Rerender without changing dependency
      rerender();

      expect(result.current.pending).toBe(true);
    });

    it('should work with empty clearOnChange array', () => {
      const { result } = renderHook(() =>
        usePendingWithTimeout({ clearOnChange: [] }),
      );

      act(() => {
        result.current.setPending(true);
      });

      expect(result.current.pending).toBe(true);

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.pending).toBe(false);
    });

    it('should work without clearOnChange option', () => {
      const { result, rerender } = renderHook(() => usePendingWithTimeout());

      act(() => {
        result.current.setPending(true);
      });

      expect(result.current.pending).toBe(true);

      // Rerender should not affect pending
      rerender();

      expect(result.current.pending).toBe(true);
    });
  });

  describe('combined timeout and clearOnChange', () => {
    it('should clear via dependency before timeout expires', () => {
      let dep = 'initial';
      const { result, rerender } = renderHook(() =>
        usePendingWithTimeout({ timeoutMs: 5000, clearOnChange: [dep] }),
      );

      act(() => {
        result.current.setPending(true);
      });

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.pending).toBe(true);

      // Dependency changes before timeout
      dep = 'changed';
      rerender();

      expect(result.current.pending).toBe(false);

      // Advancing time should not re-enable pending
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.pending).toBe(false);
    });

    it('should handle rapid state changes', () => {
      let dep = 0;
      const { result, rerender } = renderHook(() =>
        usePendingWithTimeout({ timeoutMs: 1000, clearOnChange: [dep] }),
      );

      // Rapid toggle
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.setPending(true);
        });
        dep = i;
        rerender();
      }

      // Should be cleared by dependency change
      expect(result.current.pending).toBe(false);
    });
  });

  describe('real-world usage patterns', () => {
    it('simulates test-led-button pattern: pending clears on driver state change', () => {
      const driverState = 'connected';
      let testActive = false;

      const { result, rerender } = renderHook(() =>
        usePendingWithTimeout({
          timeoutMs: 5000,
          clearOnChange: [testActive, driverState],
        }),
      );

      // User clicks button
      act(() => {
        result.current.setPending(true);
      });

      expect(result.current.pending).toBe(true);

      // Driver responds, testActive changes
      testActive = true;
      rerender();

      expect(result.current.pending).toBe(false);
    });

    it('simulates timeout when driver does not respond', () => {
      const driverState = 'connected';
      const testActive = false;

      const { result } = renderHook(() =>
        usePendingWithTimeout({
          timeoutMs: 5000,
          clearOnChange: [testActive, driverState],
        }),
      );

      // User clicks button
      act(() => {
        result.current.setPending(true);
      });

      expect(result.current.pending).toBe(true);

      // Driver doesn't respond, timeout kicks in
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(result.current.pending).toBe(false);
    });
  });
});
