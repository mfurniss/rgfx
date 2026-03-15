import { ipcMain, dialog } from 'electron';
import { INVOKE_CHANNELS } from './contract';

const VIDEO_FILE_FILTERS = [
  {
    name: 'Video Files',
    extensions: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'gif'],
  },
  { name: 'All Files', extensions: ['*'] },
];

export function registerSelectVideoFileHandler(): void {
  ipcMain.handle(
    INVOKE_CHANNELS.selectVideoFile,
    async (): Promise<string | null> => {
      const result = await dialog.showOpenDialog({
        title: 'Select Video File',
        filters: VIDEO_FILE_FILTERS,
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return null;
      }

      return result.filePaths[0];
    },
  );
}
