import { ipcMain, dialog } from 'electron';
import { INVOKE_CHANNELS } from './contract';

export function registerSelectDirectoryHandler(): void {
  ipcMain.handle(
    INVOKE_CHANNELS.selectDirectory,
    async (_event, title?: string, defaultPath?: string): Promise<string | null> => {
      const result = await dialog.showOpenDialog({
        title: title ?? 'Select Directory',
        defaultPath,
        properties: ['openDirectory', 'createDirectory'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    },
  );
}
