import { useEffect, useRef, useCallback } from 'react';
import { useUiStore } from '../store/ui-store';

/**
 * Hook that manages the simulator auto-trigger interval.
 * Should be used at the App level so it persists across navigation.
 */
export function useSimulatorAutoTrigger(): void {
  const eventLine = useUiStore((state) => state.simulatorEventLine);
  const autoInterval = useUiStore((state) => state.simulatorAutoInterval);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const triggerEvent = useCallback(async () => {
    if (!eventLine.trim()) {
      return;
    }

    try {
      await window.rgfx.simulateEvent(eventLine);
    } catch (err) {
      console.error(err);
    }
  }, [eventLine]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (autoInterval !== 'off' && eventLine.trim()) {
      // Trigger immediately when auto mode is enabled
      void triggerEvent();

      const ms = autoInterval === '1s' ? 1000 : 5000;
      intervalRef.current = setInterval(() => {
        void triggerEvent();
      }, ms);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoInterval, eventLine, triggerEvent]);
}
