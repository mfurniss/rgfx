import { useState, useMemo, useCallback } from 'react';
import type { Driver } from '@/types';

interface UseDriverSelectionOptions {
  connectedDrivers: Driver[];
  initialSelectedIds?: string[];
}

interface UseDriverSelectionReturn {
  selectedDrivers: Set<string>;
  selectAll: boolean;
  handleDriverToggle: (driverId: string) => void;
  handleSelectAll: () => void;
  setSelectedDrivers: React.Dispatch<React.SetStateAction<Set<string>>>;
}

/**
 * Manages driver selection with toggle/select-all handlers.
 * selectAll is derived via useMemo rather than stored as state,
 * preventing stale sync bugs.
 */
export function useDriverSelection({
  connectedDrivers,
  initialSelectedIds,
}: UseDriverSelectionOptions): UseDriverSelectionReturn {
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(
    () => new Set(initialSelectedIds ?? connectedDrivers.map((d) => d.id)),
  );

  const selectAll = useMemo(
    () => connectedDrivers.length > 0
      && connectedDrivers.every((d) => selectedDrivers.has(d.id)),
    [connectedDrivers, selectedDrivers],
  );

  const handleDriverToggle = useCallback((driverId: string) => {
    setSelectedDrivers((prev) => {
      const next = new Set(prev);

      if (next.has(driverId)) {
        next.delete(driverId);
      } else {
        next.add(driverId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedDrivers((prev) => {
      const allSelected = connectedDrivers.length > 0
        && connectedDrivers.every((d) => prev.has(d.id));
      return allSelected
        ? new Set<string>()
        : new Set(connectedDrivers.map((d) => d.id));
    });
  }, [connectedDrivers]);

  return {
    selectedDrivers,
    selectAll,
    handleDriverToggle,
    handleSelectAll,
    setSelectedDrivers,
  };
}
