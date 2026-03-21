import { ipcMain } from 'electron';
import log from 'electron-log/main';
import { updateLaunchScriptRomPath } from '../launch-script-updater';
import { INVOKE_CHANNELS } from './contract';

export function registerUpdateMameRomsDirHandler(): void {
  ipcMain.handle(
    INVOKE_CHANNELS.updateMameRomsDirectory,
    async (_event, romsDirectory: string) => {
      log.info(`Updating launch script ROM path: ${romsDirectory}`);
      await updateLaunchScriptRomPath(romsDirectory);
      return { success: true };
    },
  );
}
