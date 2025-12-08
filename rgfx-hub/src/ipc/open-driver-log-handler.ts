/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain } from 'electron';
import type { DriverLogPersistence } from '../driver-log-persistence';
import { openFile } from './open-file-handler';

interface OpenDriverLogHandlerDeps {
  driverLogPersistence: DriverLogPersistence;
}

export function registerOpenDriverLogHandler(deps: OpenDriverLogHandlerDeps): void {
  const { driverLogPersistence } = deps;

  ipcMain.handle('driver:open-log', async (_event, driverId: string) => {
    const logPath = driverLogPersistence.getLogFilePath(driverId);
    return openFile(logPath);
  });
}
