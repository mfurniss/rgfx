import { ipcMain } from 'electron';
import type { LEDHardwareManager } from '../led-hardware-manager';
import { INVOKE_CHANNELS } from './contract';

interface ListLEDHardwareHandlerDeps {
  ledHardwareManager: LEDHardwareManager;
}

export function registerListLEDHardwareHandler(deps: ListLEDHardwareHandlerDeps): void {
  const { ledHardwareManager } = deps;

  ipcMain.handle(INVOKE_CHANNELS.getLEDHardwareList, () => {
    return ledHardwareManager.listHardware();
  });
}
