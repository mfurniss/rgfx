import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { effectPropsSchemas } from '@/schemas';
import { DEFAULT_FX_PLAYGROUND_EFFECT, SIMULATOR_ROW_COUNT } from '@/config/constants';

function getDefaultPropsJson(effect: keyof typeof effectPropsSchemas): string {
  return JSON.stringify(effectPropsSchemas[effect].parse({}), null, 2);
}

type SortField = 'id' | 'name' | 'ip' | 'status';
type SortOrder = 'asc' | 'desc';

interface TableSortPreference {
  field: string;
  order: SortOrder;
}
export type SimulatorAutoInterval = 'off' | '1s' | '5s';
export type FlashMethod = 'usb' | 'ota';

export interface DriverFlashStatus {
  status: 'pending' | 'flashing' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface SimulatorRow {
  eventLine: string;
  autoInterval: SimulatorAutoInterval;
}

interface UiState {
  // Generic table sort preferences (for useSortableTable hook)
  tableSortPreferences: Record<string, TableSortPreference>;

  // Legacy driver table sort preferences (kept for backward compatibility)
  driverTableSortField: SortField;
  driverTableSortOrder: SortOrder;

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
  stripLifespanScale: number;

  // Firmware update state (transient, not persisted)
  isFlashingFirmware: boolean;
  firmwareFlashMethod: FlashMethod;
  firmwareSelectedDrivers: string[];
  firmwareSelectAll: boolean;
  firmwareDriverFlashStatus: Record<string, DriverFlashStatus>;

  // Actions
  setTableSort: (key: string, field: string, order: SortOrder) => void;
  setDriverTableSort: (field: SortField, order: SortOrder) => void;
  setIsFlashingFirmware: (isFlashing: boolean) => void;
  setTestEffectsState: (
    selectedEffect: string,
    propsJson: string,
    selectedDrivers: Set<string>
  ) => void;
  setSimulatorRow: (index: number, eventLine: string, autoInterval: SimulatorAutoInterval) => void;
  setRgfxConfigDirectory: (path: string) => void;
  setMameRomsDirectory: (path: string) => void;
  setFirmwareState: (
    flashMethod: FlashMethod,
    selectedDrivers: string[],
    selectAll: boolean
  ) => void;
  setFirmwareDriverFlashStatus: (status: Record<string, DriverFlashStatus>) => void;
  setLastWifiCredentials: (ssid: string, password: string) => void;
  setStripLifespanScale: (scale: number) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      // Generic table sort preferences
      tableSortPreferences: {},

      // Legacy: Driver ID ascending (kept for backward compatibility)
      driverTableSortField: 'id',
      driverTableSortOrder: 'asc',

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
      stripLifespanScale: 0.6,

      // Firmware update state
      isFlashingFirmware: false,
      firmwareFlashMethod: 'ota' as FlashMethod,
      firmwareSelectedDrivers: [],
      firmwareSelectAll: false,
      firmwareDriverFlashStatus: {},

      setTableSort: (key, field, order) => {
        set((state) => ({
          tableSortPreferences: {
            ...state.tableSortPreferences,
            [key]: { field, order },
          },
        }));
      },

      setDriverTableSort: (field, order) => {
        set({ driverTableSortField: field, driverTableSortOrder: order });
      },

      setIsFlashingFirmware: (isFlashing) => {
        set({ isFlashingFirmware: isFlashing });
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

      setFirmwareState: (flashMethod, selectedDrivers, selectAll) => {
        set({
          firmwareFlashMethod: flashMethod,
          firmwareSelectedDrivers: selectedDrivers,
          firmwareSelectAll: selectAll,
        });
      },

      setFirmwareDriverFlashStatus: (status) => {
        set({ firmwareDriverFlashStatus: status });
      },

      setLastWifiCredentials: (ssid, password) => {
        set({ lastWifiSsid: ssid, lastWifiPassword: password });
      },

      setStripLifespanScale: (scale) => {
        set({ stripLifespanScale: scale });
      },
    }),
    {
      name: 'rgfx-ui-preferences',
      version: 4,
      partialize: (state) => ({
        tableSortPreferences: state.tableSortPreferences,
        driverTableSortField: state.driverTableSortField,
        driverTableSortOrder: state.driverTableSortOrder,
        simulatorRows: state.simulatorRows,
        rgfxConfigDirectory: state.rgfxConfigDirectory,
        mameRomsDirectory: state.mameRomsDirectory,
        lastWifiSsid: state.lastWifiSsid,
        lastWifiPassword: state.lastWifiPassword,
        stripLifespanScale: state.stripLifespanScale,
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
