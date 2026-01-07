import { useCallback, useMemo } from 'react';
import { useUiStore } from '@/renderer/store/ui-store';

export type SortOrder = 'asc' | 'desc';

interface UseSortableTableOptions<T extends string> {
  /** Unique key for localStorage persistence */
  storageKey: string;
  /** Default sort field when no persisted state exists */
  defaultField: T;
  /** Default sort order (defaults to 'asc') */
  defaultOrder?: SortOrder;
  /** Fields that should default to descending order (e.g., timestamps) */
  defaultDescFields?: T[];
}

interface UseSortableTableResult<T extends string> {
  sortField: T;
  sortOrder: SortOrder;
  handleSort: (field: T) => void;
  sortData: <D>(
    data: D[],
    compareFn?: (a: D, b: D, field: T) => number
  ) => D[];
}

/**
 * Default comparator for sorting table data.
 * Handles strings (case-insensitive), numbers, and null/undefined values.
 */
function defaultComparator(a: unknown, b: unknown, field: string): number {
  const aRecord = a as Record<string, unknown>;
  const bRecord = b as Record<string, unknown>;
  const aValue = aRecord[field];
  const bValue = bRecord[field];

  // Handle null/undefined - sort to end
  if (aValue == null && bValue == null) {
    return 0;
  }

  if (aValue == null) {
    return 1;
  }

  if (bValue == null) {
    return -1;
  }

  // String comparison (case-insensitive)
  if (typeof aValue === 'string' && typeof bValue === 'string') {
    return aValue.toLowerCase().localeCompare(bValue.toLowerCase());
  }

  // Numeric comparison
  if (typeof aValue === 'number' && typeof bValue === 'number') {
    return aValue - bValue;
  }

  // Fallback: compare by coerced values
  if (aValue < bValue) {
    return -1;
  }

  if (aValue > bValue) {
    return 1;
  }

  return 0;
}

/**
 * Hook for managing sortable table state with localStorage persistence.
 *
 * @example
 * ```tsx
 * type SortField = 'name' | 'date' | 'status';
 *
 * const { sortField, sortOrder, handleSort, sortData } = useSortableTable<SortField>({
 *   storageKey: 'myTable',
 *   defaultField: 'name',
 *   defaultDescFields: ['date'],
 * });
 *
 * const sortedData = sortData(data);
 * ```
 */
export function useSortableTable<T extends string>(
  options: UseSortableTableOptions<T>,
): UseSortableTableResult<T> {
  const { storageKey, defaultField, defaultOrder = 'asc', defaultDescFields = [] } = options;

  const sortPreferences = useUiStore((state) => state.tableSortPreferences);
  const setTableSort = useUiStore((state) => state.setTableSort);

  const stored = sortPreferences[storageKey] as { field: T; order: SortOrder } | undefined;
  const sortField = stored?.field ?? defaultField;
  const sortOrder = stored?.order ?? defaultOrder;

  const handleSort = useCallback(
    (field: T) => {
      if (sortField === field) {
        // Toggle order on same field
        setTableSort(storageKey, field, sortOrder === 'asc' ? 'desc' : 'asc');
      } else {
        // Switch to new field with appropriate default order
        const newOrder = defaultDescFields.includes(field) ? 'desc' : 'asc';
        setTableSort(storageKey, field, newOrder);
      }
    },
    [sortField, sortOrder, storageKey, defaultDescFields, setTableSort],
  );

  const sortData = useCallback(
    <D>(data: D[], compareFn?: (a: D, b: D, field: T) => number): D[] => {
      const compare = compareFn ?? defaultComparator;
      return [...data].sort((a, b) => {
        const result = compare(a, b, sortField);
        return sortOrder === 'asc' ? result : -result;
      });
    },
    [sortField, sortOrder],
  );

  return useMemo(
    () => ({
      sortField,
      sortOrder,
      handleSort,
      sortData,
    }),
    [sortField, sortOrder, handleSort, sortData],
  );
}
