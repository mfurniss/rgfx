import { ipcMain } from 'electron';
import { stat } from 'fs/promises';
import { expandPath } from '../utils/expand-path';
import { INVOKE_CHANNELS } from './contract';

export function registerVerifyDirectoryHandler(): void {
  ipcMain.handle(
    INVOKE_CHANNELS.verifyDirectory,
    async (_event, path: string): Promise<boolean> => {
      const expandedPath = expandPath(path);

      try {
        const stats = await stat(expandedPath);
        return stats.isDirectory();
      } catch {
        return false;
      }
    });
}
