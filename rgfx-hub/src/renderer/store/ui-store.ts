import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { effectSchemas } from '@/schemas';
import { DEFAULT_FX_PLAYGROUND_EFFECT } from '@/config/constants';

function getDefaultPropsJson(effect: keyof typeof effectSchemas): string {
  return JSON.stringify(effectSchemas[effect].parse({}), null, 2);
}

export type SortField = 'id' | 'name' | 'ip' | 'status';
type SortOrder = 'asc' | 'desc';
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

  // Settings page state
  rgfxConfigDirectory: string;
  mameRomsDirectory: string;

  // Firmware update state (transient, not persisted)
  isFlashingFirmware: boolean;
  firmwareFlashMethod: FlashMethod;
  firmwareSelectedDrivers: string[];
  firmwareSelectAll: boolean;
  firmwareDriverFlashStatus: Record<string, DriverFlashStatus>;

  // Actions
  setDriverTableSort: (field: SortField, order: SortOrder) => void;
  setIsFlashingFirmware: (isFlashing: boolean) => void;
  setTestEffectsState: (
    selectedEffect: string,
    propsJson: string,
    selectedDrivers: Set<string>,
    selectAll: boolean
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
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      // Default: Driver ID ascending
      driverTableSortField: 'id',
      driverTableSortOrder: 'asc',

      // Test effects defaults
      testEffectsSelectedEffect: DEFAULT_FX_PLAYGROUND_EFFECT,
      testEffectsPropsJson: getDefaultPropsJson(DEFAULT_FX_PLAYGROUND_EFFECT),
      testEffectsSelectedDrivers: [],
      testEffectsSelectAll: false,

      // Simulator defaults (6 empty rows)
      simulatorRows: Array.from({ length: SIMULATOR_ROW_COUNT }, () => ({
        eventLine: '',
        autoInterval: 'off' as SimulatorAutoInterval,
      })),

      // Settings defaults
      rgfxConfigDirectory: '',
      mameRomsDirectory: '',

      // Firmware update state
      isFlashingFirmware: false,
      firmwareFlashMethod: 'ota' as FlashMethod,
      firmwareSelectedDrivers: [],
      firmwareSelectAll: false,
      firmwareDriverFlashStatus: {},

      setDriverTableSort: (field, order) => {
        set({ driverTableSortField: field, driverTableSortOrder: order });
      },

      setIsFlashingFirmware: (isFlashing) => {
        set({ isFlashingFirmware: isFlashing });
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
    }),
    {
      name: 'rgfx-ui-preferences',
      partialize: (state) => ({
        driverTableSortField: state.driverTableSortField,
        driverTableSortOrder: state.driverTableSortOrder,
        simulatorRows: state.simulatorRows,
        rgfxConfigDirectory: state.rgfxConfigDirectory,
        mameRomsDirectory: state.mameRomsDirectory,
        testEffectsSelectedEffect: state.testEffectsSelectedEffect,
        testEffectsPropsJson: state.testEffectsPropsJson,
        testEffectsSelectedDrivers: state.testEffectsSelectedDrivers,
        testEffectsSelectAll: state.testEffectsSelectAll,
      }),
    },
  ),
);
