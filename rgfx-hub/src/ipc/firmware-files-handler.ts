import { ipcMain, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import log from 'electron-log/main';
import { INVOKE_CHANNELS } from './contract';

function getFirmwareDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'firmware')
    : path.join(app.getAppPath(), 'assets', 'esp32', 'firmware');
}

export function registerFirmwareFilesHandler(): void {
  ipcMain.handle(INVOKE_CHANNELS.getFirmwareManifest, async () => {
    try {
      const firmwareDir = getFirmwareDir();
      const manifestPath = path.join(firmwareDir, 'manifest.json');

      log.info(`Loading firmware manifest from: ${manifestPath}`);

      const content = await fs.readFile(manifestPath, 'utf-8');
      return JSON.parse(content) as unknown;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error('Failed to load firmware manifest:', message);
      throw new Error(`Failed to load firmware manifest: ${message}`);
    }
  });

  ipcMain.handle(INVOKE_CHANNELS.getFirmwareFile, async (_event, filename: string) => {
    try {
      // Validate filename to prevent path traversal
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        throw new Error('Invalid filename');
      }

      const firmwareDir = getFirmwareDir();
      const filePath = path.join(firmwareDir, filename);

      log.info(`Loading firmware file: ${filePath}`);

      const buffer = await fs.readFile(filePath);
      return buffer;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      log.error(`Failed to load firmware file ${filename}:`, message);
      throw new Error(`Failed to load firmware file: ${message}`);
    }
  });
}
