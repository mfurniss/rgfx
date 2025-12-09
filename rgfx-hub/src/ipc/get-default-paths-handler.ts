/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain } from 'electron';
import { CONFIG_DIRECTORY, ROMS_DIRECTORY, getLicensePath } from '../config/paths';
import type { DefaultPaths } from '../types';

export function registerGetDefaultPathsHandler(): void {
  ipcMain.handle('paths:get-defaults', (): DefaultPaths => {
    return {
      rgfxConfigDirectory: CONFIG_DIRECTORY,
      mameRomsDirectory: ROMS_DIRECTORY,
      licensePath: getLicensePath(),
    };
  });
}
