/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { execFile } from 'child_process';
import { ipcMain, dialog } from 'electron';
import log from 'electron-log/main';
import { format } from 'date-fns';
import { CONFIG_DIRECTORY } from '../config/paths';

export function registerBackupHandler(): void {
  ipcMain.handle(
    'backup:create',
    async (): Promise<{ success: boolean; error?: string }> => {
      const defaultFilename = `rgfx-backup-${format(new Date(), 'yyyy-MM-dd')}.zip`;

      const result = await dialog.showSaveDialog({
        title: 'Save RGFX Backup',
        defaultPath: defaultFilename,
        filters: [{ name: 'Zip Archives', extensions: ['zip'] }],
      });

      if (result.canceled || !result.filePath) {
        return { success: false };
      }

      try {
        await createZip(CONFIG_DIRECTORY, result.filePath);
        log.info(`Backup saved to ${result.filePath}`);
        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Backup failed: ${message}`, error);
        return { success: false, error: message };
      }
    },
  );
}

function createZip(sourceDir: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const callback = (error: Error | null, _stdout: string, stderr: string) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve();
      }
    };

    if (process.platform === 'win32') {
      // PowerShell Compress-Archive available since Windows 10
      execFile('powershell', [
        '-NoProfile', '-Command',
        `Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${outputPath}' -Force`,
      ], callback);
    } else {
      // macOS: zip is available natively
      execFile('zip', ['-r', outputPath, '.'], { cwd: sourceDir }, callback);
    }
  });
}
