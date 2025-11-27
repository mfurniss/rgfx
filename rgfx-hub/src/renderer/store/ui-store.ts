import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SortField = 'id' | 'name' | 'ip' | 'status';
type SortOrder = 'asc' | 'desc';

interface UiState {
  // Driver table sort preferences
  driverTableSortField: SortField;
  driverTableSortOrder: SortOrder;

  // Test effects page state
  testEffectsSelectedEffect: string;
  testEffectsPropsJson: string;
  testEffectsSelectedDrivers: string[]; // Set serialized as array
  testEffectsSelectAll: boolean;

  // Actions
  setDriverTableSort: (field: SortField, order: SortOrder) => void;
  setTestEffectsState: (
    selectedEffect: string,
    propsJson: string,
    selectedDrivers: Set<string>,
    selectAll: boolean
  ) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      // Default: Device ID ascending
      driverTableSortField: 'id',
      driverTableSortOrder: 'asc',

      // Test effects defaults
      testEffectsSelectedEffect: 'pulse',
      testEffectsPropsJson: JSON.stringify({ color: 'random', duration: 1000, fade: true }, null, 2),
      testEffectsSelectedDrivers: [],
      testEffectsSelectAll: false,

      setDriverTableSort: (field, order) => {
        set({ driverTableSortField: field, driverTableSortOrder: order });
      },

      setTestEffectsState: (selectedEffect, propsJson, selectedDrivers, selectAll) => {
        set({
          testEffectsSelectedEffect: selectedEffect,
          testEffectsPropsJson: propsJson,
          testEffectsSelectedDrivers: Array.from(selectedDrivers),
          testEffectsSelectAll: selectAll,
        });
      },
    }),
    {
      name: 'rgfx-ui-preferences',
      partialize: (state) => ({
        driverTableSortField: state.driverTableSortField,
        driverTableSortOrder: state.driverTableSortOrder,
        // Exclude test effects state from persistence
      }),
    }
  )
);
