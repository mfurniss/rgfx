import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SortField = 'id' | 'name' | 'ip' | 'status';
type SortOrder = 'asc' | 'desc';
export type SimulatorAutoInterval = 'off' | '1s' | '5s';

interface SimulatorRow {
  eventLine: string;
  autoInterval: SimulatorAutoInterval;
}

const SIMULATOR_ROW_COUNT = 6;

interface UiState {
  // Driver table sort preferences
  driverTableSortField: SortField;
  driverTableSortOrder: SortOrder;

  // Test effects page state
  testEffectsSelectedEffect: string;
  testEffectsPropsJson: string;
  testEffectsSelectedDrivers: string[]; // Set serialized as array
  testEffectsSelectAll: boolean;

  // Simulator page state
  simulatorRows: SimulatorRow[];

  // Actions
  setDriverTableSort: (field: SortField, order: SortOrder) => void;
  setTestEffectsState: (
    selectedEffect: string,
    propsJson: string,
    selectedDrivers: Set<string>,
    selectAll: boolean
  ) => void;
  setSimulatorRow: (index: number, eventLine: string, autoInterval: SimulatorAutoInterval) => void;
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

      // Simulator defaults (6 empty rows)
      simulatorRows: Array.from({ length: SIMULATOR_ROW_COUNT }, () => ({
        eventLine: '',
        autoInterval: 'off' as SimulatorAutoInterval,
      })),

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

      setSimulatorRow: (index, eventLine, autoInterval) => {
        set((state) => {
          const newRows = [...state.simulatorRows];
          newRows[index] = { eventLine, autoInterval };
          return { simulatorRows: newRows };
        });
      },
    }),
    {
      name: 'rgfx-ui-preferences',
      partialize: (state) => ({
        driverTableSortField: state.driverTableSortField,
        driverTableSortOrder: state.driverTableSortOrder,
        simulatorRows: state.simulatorRows,
      }),
    },
  ),
);
