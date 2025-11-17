import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SortField = 'id' | 'name' | 'ip' | 'status' | 'firstSeen';
export type SortOrder = 'asc' | 'desc';

interface UiState {
  // Driver table sort preferences
  driverTableSortField: SortField;
  driverTableSortOrder: SortOrder;

  // Actions
  setDriverTableSort: (field: SortField, order: SortOrder) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      // Default: Device ID ascending
      driverTableSortField: 'id',
      driverTableSortOrder: 'asc',

      setDriverTableSort: (field, order) => {
        set({ driverTableSortField: field, driverTableSortOrder: order });
      },
    }),
    {
      name: 'rgfx-ui-preferences',
    }
  )
);
