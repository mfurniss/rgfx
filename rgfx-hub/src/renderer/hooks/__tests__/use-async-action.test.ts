import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAsyncAction } from '../use-async-action';

describe('useAsyncAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with pending false', () => {
      const action = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAsyncAction(action));

      expect(result.current.pending).toBe(false);
    });

    it('should provide an execute function', () => {
      const action = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAsyncAction(action));

      expect(typeof result.current.execute).toBe('function');
    });
  });

  describe('execute', () => {
    it('should call the action with provided arguments', async () => {
      const action = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAsyncAction(action));

      act(() => {
        result.current.execute('arg1', 'arg2');
      });

      await waitFor(() => {
        expect(action).toHaveBeenCalledWith('arg1', 'arg2');
      });
    });

    it('should set pending to true during execution', async () => {
      let resolveAction: () => void;
      const action = vi.fn().mockImplementation(
        () => new Promise<void>((resolve) => {
          resolveAction = resolve;
        }),
      );
      const { result } = renderHook(() => useAsyncAction(action));

      act(() => {
        result.current.execute();
      });

      expect(result.current.pending).toBe(true);

      await act(() => {
        resolveAction!();
        return Promise.resolve();
      });

      expect(result.current.pending).toBe(false);
    });

    it('should set pending to false after successful completion', async () => {
      const action = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAsyncAction(action));

      act(() => {
        result.current.execute();
      });

      await waitFor(() => {
        expect(result.current.pending).toBe(false);
      });
    });

    it('should set pending to false after error', async () => {
      const action = vi.fn().mockRejectedValue(new Error('Test error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { result } = renderHook(() => useAsyncAction(action));

      act(() => {
        result.current.execute();
      });

      await waitFor(() => {
        expect(result.current.pending).toBe(false);
      });

      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should call onError callback when action fails', async () => {
      const error = new Error('Test error');
      const action = vi.fn().mockRejectedValue(error);
      const onError = vi.fn();
      const { result } = renderHook(() => useAsyncAction(action, { onError }));

      act(() => {
        result.current.execute();
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(error);
      });
    });

    it('should log to console.error when no onError provided', async () => {
      const error = new Error('Test error');
      const action = vi.fn().mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { result } = renderHook(() => useAsyncAction(action));

      act(() => {
        result.current.execute();
      });

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Action failed:', error);
      });

      consoleSpy.mockRestore();
    });

    it('should not log to console when onError is provided', async () => {
      const error = new Error('Test error');
      const action = vi.fn().mockRejectedValue(error);
      const onError = vi.fn();
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const { result } = renderHook(() => useAsyncAction(action, { onError }));

      act(() => {
        result.current.execute();
      });

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('typed arguments', () => {
    it('should support typed action arguments', async () => {
      const action = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() =>
        useAsyncAction<[string, number]>(action),
      );

      act(() => {
        result.current.execute('test', 42);
      });

      await waitFor(() => {
        expect(action).toHaveBeenCalledWith('test', 42);
      });
    });

    it('should support no arguments', async () => {
      const action = vi.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => useAsyncAction<[]>(action));

      act(() => {
        result.current.execute();
      });

      await waitFor(() => {
        expect(action).toHaveBeenCalledWith();
      });
    });
  });
});
