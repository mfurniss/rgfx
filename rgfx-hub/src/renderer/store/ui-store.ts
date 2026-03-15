import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { effectPropsSchemas } from '@/schemas';
import { DEFAULT_FX_PLAYGROUND_EFFECT, SIMULATOR_ROW_COUNT } from '@/config/constants';
import { createDebouncedStorage } from './debounced-storage';

function getDefaultPropsJson(effect: keyof typeof effectPropsSchemas): string {
  return JSON.stringify(effectPropsSchemas[effect].parse({}), null, 2);
}

type SortOrder = 'asc' | 'desc';

interface TableSortPreference {
  field: string;
  order: SortOrder;
}
export type SimulatorAutoInterval = 'off' | '1s' | '5s';

interface SimulatorRow {
  eventLine: string;
  autoInterval: SimulatorAutoInterval;
}

interface UiState {
  // Generic table sort preferences (for useSortableTable hook)
  tableSortPreferences: Record<string, TableSortPreference>;

  // Test effects page state
  testEffectsSelectedEffect: string;
  testEffectsPropsMap: Record<string, string>; // Effect name -> props JSON
  testEffectsSelectedDrivers: string[]; // Set serialized as array

  // Simulator page state
  simulatorRows: SimulatorRow[];

  // Settings page state
  rgfxConfigDirectory: string;
  mameRomsDirectory: string;

  // WiFi configuration persistence
  lastWifiSsid: string;
  lastWifiPassword: string;

  // Effects settings
  driverFallbackEnabled: boolean;
  stripLifespanScale: number;

  // Actions
  setTableSort: (key: string, field: string, order: SortOrder) => void;
  setTestEffectsState: (
    selectedEffect: string,
    propsJson: string,
    selectedDrivers: Set<string>
  ) => void;
  setSimulatorRow: (index: number, eventLine: string, autoInterval: SimulatorAutoInterval) => void;
  setRgfxConfigDirectory: (path: string) => void;
  setMameRomsDirectory: (path: string) => void;
  setLastWifiCredentials: (ssid: string, password: string) => void;
  setDriverFallbackEnabled: (enabled: boolean) => void;
  setStripLifespanScale: (scale: number) => void;
  resetAllAutoIntervals: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      // Generic table sort preferences
      tableSortPreferences: {},

      // Test effects defaults
      testEffectsSelectedEffect: DEFAULT_FX_PLAYGROUND_EFFECT,
      testEffectsPropsMap: {
        [DEFAULT_FX_PLAYGROUND_EFFECT]: getDefaultPropsJson(DEFAULT_FX_PLAYGROUND_EFFECT),
      },
      testEffectsSelectedDrivers: [],

      // Simulator defaults
      simulatorRows: Array.from({ length: SIMULATOR_ROW_COUNT }, () => ({
        eventLine: '',
        autoInterval: 'off' as SimulatorAutoInterval,
      })),

      // Settings defaults
      rgfxConfigDirectory: '',
      mameRomsDirectory: '',

      // WiFi configuration defaults
      lastWifiSsid: '',
      lastWifiPassword: '',

      // Effects settings defaults
      driverFallbackEnabled: true,
      stripLifespanScale: 0.6,

      setTableSort: (key, field, order) => {
        set((state) => ({
          tableSortPreferences: {
            ...state.tableSortPreferences,
            [key]: { field, order },
          },
        }));
      },

      setTestEffectsState: (selectedEffect, propsJson, selectedDrivers) => {
        set((state) => ({
          testEffectsSelectedEffect: selectedEffect,
          testEffectsPropsMap: {
            ...state.testEffectsPropsMap,
            [selectedEffect]: propsJson,
          },
          testEffectsSelectedDrivers: Array.from(selectedDrivers),
        }));
      },

      setSimulatorRow: (index, eventLine, autoInterval) => {
        set((state) => {
          const newRows = [...state.simulatorRows];
          newRows[index] = { eventLine, autoInterval };
          return { simulatorRows: newRows };
        });
      },

      setRgfxConfigDirectory: (path) => {
        set({ rgfxConfigDirectory: path });
      },

      setMameRomsDirectory: (path) => {
        set({ mameRomsDirectory: path });
      },

      setLastWifiCredentials: (ssid, password) => {
        set({ lastWifiSsid: ssid, lastWifiPassword: password });
      },

      setDriverFallbackEnabled: (enabled) => {
        set({ driverFallbackEnabled: enabled });
      },

      setStripLifespanScale: (scale) => {
        set({ stripLifespanScale: scale });
      },

      resetAllAutoIntervals: () => {
        set((state) => ({
          simulatorRows: state.simulatorRows.map((row) => ({
            ...row,
            autoInterval: 'off' as SimulatorAutoInterval,
          })),
        }));
      },
    }),
    {
      name: 'rgfx-ui-preferences',
      version: 5,
      storage: createJSONStorage(() => createDebouncedStorage(500)),
      partialize: (state) => ({
        tableSortPreferences: state.tableSortPreferences,
        simulatorRows: state.simulatorRows,
        rgfxConfigDirectory: state.rgfxConfigDirectory,
        mameRomsDirectory: state.mameRomsDirectory,
        lastWifiSsid: state.lastWifiSsid,
        lastWifiPassword: state.lastWifiPassword,
        driverFallbackEnabled: state.driverFallbackEnabled,
        stripLifespanScale: state.stripLifespanScale,
        testEffectsSelectedEffect: state.testEffectsSelectedEffect,
      }),
      migrate: (persistedState: unknown) => {
        const state = persistedState as Partial<UiState>;

        // Migrate simulator rows to match SIMULATOR_ROW_COUNT
        if (state.simulatorRows && state.simulatorRows.length < SIMULATOR_ROW_COUNT) {
          const additionalRows = SIMULATOR_ROW_COUNT - state.simulatorRows.length;
          const newRows = [
            ...state.simulatorRows,
            ...Array.from({ length: additionalRows }, () => ({
              eventLine: '',
              autoInterval: 'off' as SimulatorAutoInterval,
            })),
          ];
          state.simulatorRows = newRows;
        }

        return state as UiState;
      },
    },
  ),
);
