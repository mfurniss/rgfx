import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { UdpClient } from '../types/transformer-types';
import { INVOKE_CHANNELS } from './contract';

interface SetDriverFallbackHandlerDeps {
  udpClient: UdpClient;
}

export function registerSetDriverFallbackHandler(deps: SetDriverFallbackHandlerDeps): void {
  const { udpClient } = deps;

  ipcMain.handle(
    INVOKE_CHANNELS.setDriverFallbackEnabled,
    (_event, enabled: boolean) => {
      log.info(`Setting driver fallback enabled: ${enabled}`);
      udpClient.setDriverFallbackEnabled(enabled);
      return { success: true };
    },
  );
}
