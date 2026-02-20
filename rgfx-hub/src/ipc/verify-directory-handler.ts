/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

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
