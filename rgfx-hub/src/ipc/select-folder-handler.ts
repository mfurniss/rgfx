/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain, dialog } from 'electron';

export function registerSelectFolderHandler(): void {
  ipcMain.handle(
    'dialog:select-folder',
    async (_event, title?: string, defaultPath?: string): Promise<string | null> => {
      const result = await dialog.showOpenDialog({
        title: title ?? 'Select Folder',
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
