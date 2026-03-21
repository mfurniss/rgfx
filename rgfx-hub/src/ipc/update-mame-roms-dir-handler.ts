import { ipcMain } from 'electron';
import log from 'electron-log/main';
import { installLaunchScript } from '../launch-script-installer';
import { INVOKE_CHANNELS } from './contract';

export function registerUpdateMameRomsDirHandler(): void {
  ipcMain.handle(
    INVOKE_CHANNELS.updateMameRomsDirectory,
    async (_event, romsDirectory: string) => {
      log.info(`Updating launch script ROM path: ${romsDirectory}`);
      await installLaunchScript({ forceOverwrite: true, romPath: romsDirectory });
      return { success: true };
    },
  );
}
