/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain, app } from 'electron';
import { join } from 'path';

export function registerGetLicensePathHandler(): void {
  ipcMain.handle('paths:get-license', (): string => {
    return app.isPackaged
      ? join(process.resourcesPath, 'LICENSE')
      : join(app.getAppPath(), '..', 'LICENSE');
  });
}
