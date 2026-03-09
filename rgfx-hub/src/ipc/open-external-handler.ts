import { ipcMain, shell } from 'electron';
import { INVOKE_CHANNELS } from './contract';

export function registerOpenExternalHandler(): void {
  ipcMain.handle(
    INVOKE_CHANNELS.openExternal,
    async (_event, url: string) => {
      await shell.openExternal(url);
    },
  );
}
