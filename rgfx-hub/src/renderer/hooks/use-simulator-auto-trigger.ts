import { useEffect, useRef } from 'react';
import { useUiStore } from '../store/ui-store';

/**
 * Hook that manages the simulator auto-trigger intervals for all rows.
 * Uses a single effect that directly manages intervals based on store state.
 */
export function useSimulatorAutoTrigger(): void {
  const intervalRefs = useRef<(NodeJS.Timeout | null)[]>([null, null, null, null, null, null]);

  useEffect(() => {
    // Subscribe to store changes
    const unsubscribe = useUiStore.subscribe((state, prevState) => {
      state.simulatorRows.forEach((row, index) => {
        const prevRow = prevState.simulatorRows[index];
        const intervalChanged = row.autoInterval !== prevRow.autoInterval;

        if (intervalChanged) {
          // Clear existing interval for this row
          const existingInterval = intervalRefs.current[index];

          if (existingInterval) {
            clearInterval(existingInterval);
            intervalRefs.current[index] = null;
          }

          // Set up new interval if not 'off'
          if (row.autoInterval !== 'off') {
            const ms = row.autoInterval === '1s' ? 1000 : 5000;

            // Trigger immediately
            if (row.eventLine.trim()) {
              void window.rgfx.simulateEvent(row.eventLine);
            }

            // Set up recurring interval
            intervalRefs.current[index] = setInterval(() => {
              const currentRow = useUiStore.getState().simulatorRows[index];

              if (currentRow.eventLine.trim() && currentRow.autoInterval !== 'off') {
                void window.rgfx.simulateEvent(currentRow.eventLine);
              }
            }, ms);
          }
        }
      });
    });

    // Initialize intervals for any rows that already have auto-trigger enabled
    const initialState = useUiStore.getState();

    initialState.simulatorRows.forEach((row, index) => {
      if (row.autoInterval !== 'off') {
        const ms = row.autoInterval === '1s' ? 1000 : 5000;

        if (row.eventLine.trim()) {
          void window.rgfx.simulateEvent(row.eventLine);
        }

        intervalRefs.current[index] = setInterval(() => {
          const currentRow = useUiStore.getState().simulatorRows[index];

          if (currentRow.eventLine.trim() && currentRow.autoInterval !== 'off') {
            void window.rgfx.simulateEvent(currentRow.eventLine);
          }
        }, ms);
      }
    });

    return () => {
      unsubscribe();
      intervalRefs.current.forEach((interval) => {
        if (interval) {
          clearInterval(interval);
        }
      });
      intervalRefs.current = [null, null, null, null, null, null];
    };
  }, []);
}
