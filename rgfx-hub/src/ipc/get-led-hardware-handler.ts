import { ipcMain } from 'electron';
import type { LEDHardwareManager } from '../led-hardware-manager';
import type { LEDHardware } from '../types';
import { INVOKE_CHANNELS } from './contract';

interface GetLEDHardwareHandlerDeps {
  ledHardwareManager: LEDHardwareManager;
}

export function registerGetLEDHardwareHandler(deps: GetLEDHardwareHandlerDeps): void {
  const { ledHardwareManager } = deps;

  ipcMain.handle(
    INVOKE_CHANNELS.getLEDHardware,
    (_event, hardwareRef: string): LEDHardware | null => {
      return ledHardwareManager.loadHardware(hardwareRef);
    },
  );
}
