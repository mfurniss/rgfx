/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain, shell } from 'electron';
import * as fs from 'fs';
import log from 'electron-log/main';

const FILE_NOT_FOUND_ERROR = 'File does not exist';

export async function openFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  if (!fs.existsSync(filePath)) {
    log.warn(`${FILE_NOT_FOUND_ERROR}: ${filePath}`);
    return { success: false, error: FILE_NOT_FOUND_ERROR };
  }

  log.info(`Opening file: ${filePath}`);
  const result = await shell.openPath(filePath);

  if (result) {
    log.error(`Failed to open file: ${result}`);
    return { success: false, error: result };
  }

  return { success: true };
}

export function registerOpenFileHandler(): void {
  ipcMain.handle('file:open', async (_event, filePath: string) => {
    return openFile(filePath);
  });
}
