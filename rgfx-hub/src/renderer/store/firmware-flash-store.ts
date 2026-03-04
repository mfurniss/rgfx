import { create } from 'zustand';

export type FlashMethod = 'usb' | 'ota';

export interface DriverFlashStatus {
  status: 'pending' | 'flashing' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface FirmwareFlashState {
  // State
  isFlashingFirmware: boolean;
  firmwareFlashMethod: FlashMethod;
  firmwareSelectedDrivers: string[];
  firmwareSelectAll: boolean;
  firmwareDriverFlashStatus: Record<string, DriverFlashStatus>;

  // Actions
  setIsFlashingFirmware: (isFlashing: boolean) => void;
  setFirmwareFlashMethod: (method: FlashMethod) => void;
  setFirmwareState: (
    flashMethod: FlashMethod,
    selectedDrivers: string[],
    selectAll: boolean,
  ) => void;
  setFirmwareDriverFlashStatus: (
    status: Record<string, DriverFlashStatus>,
  ) => void;
}

export const useFirmwareFlashStore = create<FirmwareFlashState>()((set) => ({
  isFlashingFirmware: false,
  firmwareFlashMethod: 'ota' as FlashMethod,
  firmwareSelectedDrivers: [],
  firmwareSelectAll: false,
  firmwareDriverFlashStatus: {},

  setIsFlashingFirmware: (isFlashing) => {
    set({ isFlashingFirmware: isFlashing });
  },

  setFirmwareFlashMethod: (method) => {
    set({ firmwareFlashMethod: method });
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
}));
