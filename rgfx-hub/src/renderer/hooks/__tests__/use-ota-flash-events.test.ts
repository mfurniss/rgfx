import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOtaFlashEvents } from '../use-ota-flash-events';
import type { DriverFlashStatus } from '@/renderer/store/ui-store';

type StateCallback = (data: { driverId: string; state: string }) => void;
type ProgressCallback = (data: {
  driverId: string; sent: number; total: number; percent: number;
}) => void;
type ErrorCallback = (data: { driverId: string; error: string }) => void;

describe('useOtaFlashEvents', () => {
  let stateCallback: StateCallback | null = null;
  let progressCallback: ProgressCallback | null = null;
  let errorCallback: ErrorCallback | null = null;

  const mockUnsubscribeState = vi.fn();
  const mockUnsubscribeProgress = vi.fn();
  const mockUnsubscribeError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    stateCallback = null;
    progressCallback = null;
    errorCallback = null;

    (window as unknown as { rgfx: Record<string, unknown> }).rgfx = {
      onFlashOtaState: vi.fn((cb: StateCallback) => {
        stateCallback = cb;
        return mockUnsubscribeState;
      }),
      onFlashOtaProgress: vi.fn((cb: ProgressCallback) => {
        progressCallback = cb;
        return mockUnsubscribeProgress;
      }),
      onFlashOtaError: vi.fn((cb: ErrorCallback) => {
        errorCallback = cb;
        return mockUnsubscribeError;
      }),
    };
  });

  afterEach(() => {
    stateCallback = null;
    progressCallback = null;
    errorCallback = null;
  });

  describe('subscription setup', () => {
    it('should subscribe to all three event types on mount', () => {
      const addLog = vi.fn();
      const setDriverFlashStatus = vi.fn();

      renderHook(() => {
        useOtaFlashEvents({ addLog, setDriverFlashStatus });
      });

      expect(window.rgfx.onFlashOtaState).toHaveBeenCalledTimes(1);
      expect(window.rgfx.onFlashOtaProgress).toHaveBeenCalledTimes(1);
      expect(window.rgfx.onFlashOtaError).toHaveBeenCalledTimes(1);
    });
  });

  describe('state events', () => {
    it('should log state changes', () => {
      const addLog = vi.fn();
      const setDriverFlashStatus = vi.fn();

      renderHook(() => {
        useOtaFlashEvents({ addLog, setDriverFlashStatus });
      });

      stateCallback!({ driverId: 'driver-1', state: 'starting' });

      expect(addLog).toHaveBeenCalledWith('[driver-1] OTA state: starting');
    });
  });

  describe('progress events', () => {
    it('should update driver flash status with progress', () => {
      const addLog = vi.fn();
      const setDriverFlashStatus = vi.fn();

      renderHook(() => {
        useOtaFlashEvents({ addLog, setDriverFlashStatus });
      });

      progressCallback!({ driverId: 'driver-1', sent: 5000, total: 10000, percent: 50 });

      expect(setDriverFlashStatus).toHaveBeenCalledTimes(1);
      const updater = setDriverFlashStatus.mock.calls[0][0];

      // Test the updater function
      const initialMap = new Map<string, DriverFlashStatus>([
        ['driver-1', { status: 'pending', progress: 0 }],
      ]);
      const resultMap = updater(initialMap);

      expect(resultMap.get('driver-1')).toEqual({
        status: 'flashing',
        progress: 50,
      });
    });

    it('should log progress updates', () => {
      const addLog = vi.fn();
      const setDriverFlashStatus = vi.fn();

      renderHook(() => {
        useOtaFlashEvents({ addLog, setDriverFlashStatus });
      });

      progressCallback!({ driverId: 'driver-1', sent: 5000, total: 10000, percent: 50 });

      expect(addLog).toHaveBeenCalledWith('[driver-1] OTA progress: 50% (5000/10000 bytes)');
    });

    it('should not update status for unknown driver', () => {
      const addLog = vi.fn();
      const setDriverFlashStatus = vi.fn();

      renderHook(() => {
        useOtaFlashEvents({ addLog, setDriverFlashStatus });
      });

      progressCallback!({ driverId: 'unknown-driver', sent: 5000, total: 10000, percent: 50 });

      const updater = setDriverFlashStatus.mock.calls[0][0];
      const emptyMap = new Map<string, DriverFlashStatus>();
      const resultMap = updater(emptyMap);

      expect(resultMap.get('unknown-driver')).toBeUndefined();
    });
  });

  describe('error events', () => {
    it('should log error messages', () => {
      const addLog = vi.fn();
      const setDriverFlashStatus = vi.fn();

      renderHook(() => {
        useOtaFlashEvents({ addLog, setDriverFlashStatus });
      });

      errorCallback!({ driverId: 'driver-1', error: 'Connection timeout' });

      expect(addLog).toHaveBeenCalledWith('[driver-1] OTA error: Connection timeout');
    });

    it('should update driver flash status to error', () => {
      const addLog = vi.fn();
      const setDriverFlashStatus = vi.fn();

      renderHook(() => {
        useOtaFlashEvents({ addLog, setDriverFlashStatus });
      });

      errorCallback!({ driverId: 'driver-1', error: 'Connection timeout' });

      const updater = setDriverFlashStatus.mock.calls[0][0];
      const initialMap = new Map<string, DriverFlashStatus>([
        ['driver-1', { status: 'flashing', progress: 50 }],
      ]);
      const resultMap = updater(initialMap);

      expect(resultMap.get('driver-1')).toEqual({
        status: 'error',
        progress: 50,
        error: 'Connection timeout',
      });
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe from all events on unmount', () => {
      const addLog = vi.fn();
      const setDriverFlashStatus = vi.fn();

      const { unmount } = renderHook(() => {
        useOtaFlashEvents({ addLog, setDriverFlashStatus });
      });

      unmount();

      expect(mockUnsubscribeState).toHaveBeenCalledTimes(1);
      expect(mockUnsubscribeProgress).toHaveBeenCalledTimes(1);
      expect(mockUnsubscribeError).toHaveBeenCalledTimes(1);
    });
  });

  describe('handler updates', () => {
    it('should resubscribe when handlers change', () => {
      const addLog1 = vi.fn();
      const addLog2 = vi.fn();
      const setDriverFlashStatus = vi.fn();

      const { rerender } = renderHook(
        ({ addLog }) => {
          useOtaFlashEvents({ addLog, setDriverFlashStatus });
        },
        { initialProps: { addLog: addLog1 } },
      );

      expect(window.rgfx.onFlashOtaState).toHaveBeenCalledTimes(1);

      rerender({ addLog: addLog2 });

      // Should have unsubscribed and resubscribed
      expect(mockUnsubscribeState).toHaveBeenCalledTimes(1);
      expect(window.rgfx.onFlashOtaState).toHaveBeenCalledTimes(2);
    });
  });
});
