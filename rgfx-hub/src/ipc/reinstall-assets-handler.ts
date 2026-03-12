import { ipcMain } from 'electron';
import log from 'electron-log/main';
import { INVOKE_CHANNELS } from './contract';
import { reinstallAllAssets } from '../asset-reinstaller';
import { getErrorMessage } from '../utils/driver-utils';

export function registerReinstallAssetsHandler(): void {
  ipcMain.handle(
    INVOKE_CHANNELS.reinstallAssets,
    async (): Promise<{ success: boolean; error?: string }> => {
      try {
        await reinstallAllAssets();
        return { success: true };
      } catch (error) {
        log.error('Failed to reinstall assets:', error);
        return { success: false, error: getErrorMessage(error) };
      }
    },
  );
}
