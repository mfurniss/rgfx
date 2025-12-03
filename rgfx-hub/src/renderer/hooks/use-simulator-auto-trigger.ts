import { useEffect, useRef, useCallback } from 'react';
import { useUiStore, SimulatorRow } from '../store/ui-store';

/**
 * Hook that manages the simulator auto-trigger intervals for all rows.
 * Should be used at the App level so it persists across navigation.
 */
export function useSimulatorAutoTrigger(): void {
  const simulatorRows = useUiStore((state) => state.simulatorRows);
  const intervalsRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const prevRowsRef = useRef<(SimulatorRow | undefined)[]>([]);

  const triggerEvent = useCallback(async (eventLine: string) => {
    if (!eventLine.trim()) {
      return;
    }

    try {
      await window.rgfx.simulateEvent(eventLine);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Main effect to manage intervals per row
  useEffect(() => {
    const currentIntervals = intervalsRef.current;
    const prevRows = prevRowsRef.current;

    // Process each row
    simulatorRows.forEach((row: SimulatorRow, index: number) => {
      const prevRow = prevRows[index];
      const existingInterval = currentIntervals.get(index);
      const shouldHaveInterval = row.autoInterval !== 'off' && row.eventLine.trim();

      // Check if this row's settings actually changed
      const rowChanged =
        prevRow === undefined ||
        prevRow.eventLine !== row.eventLine ||
        prevRow.autoInterval !== row.autoInterval;

      if (shouldHaveInterval) {
        if (rowChanged) {
          const ms = row.autoInterval === '1s' ? 1000 : 5000;

          // Clear existing interval if settings changed
          if (existingInterval) {
            clearInterval(existingInterval);
          }

          // Trigger immediately when auto mode is enabled or changed
          void triggerEvent(row.eventLine);

          // Set new interval
          const newInterval = setInterval(() => {
            void triggerEvent(row.eventLine);
          }, ms);
          currentIntervals.set(index, newInterval);
        }
      } else if (existingInterval) {
        // Clear interval if no longer needed
        clearInterval(existingInterval);
        currentIntervals.delete(index);
      }
    });

    // Store current rows for next comparison
    prevRowsRef.current = simulatorRows;

    // No cleanup here - we manage intervals manually above
  }, [simulatorRows, triggerEvent]);

  // Cleanup only on unmount
  useEffect(() => {
    const currentIntervals = intervalsRef.current;
    return () => {
      currentIntervals.forEach((interval) => {
        clearInterval(interval);
      });
      currentIntervals.clear();
    };
  }, []);
}
