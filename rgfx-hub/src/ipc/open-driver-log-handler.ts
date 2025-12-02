/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain, shell } from 'electron';
import * as fs from 'fs';
import log from 'electron-log/main';
import type { DriverLogPersistence } from '../driver-log-persistence';

interface OpenDriverLogHandlerDeps {
  driverLogPersistence: DriverLogPersistence;
}

export function registerOpenDriverLogHandler(deps: OpenDriverLogHandlerDeps): void {
  const { driverLogPersistence } = deps;

  ipcMain.handle('driver:open-log', async (_event, driverId: string) => {
    const logPath = driverLogPersistence.getLogFilePath(driverId);

    if (!fs.existsSync(logPath)) {
      log.warn(`Log file does not exist for driver ${driverId}: ${logPath}`);
      return { success: false, error: 'Log file does not exist' };
    }

    log.info(`Opening log file for driver ${driverId}: ${logPath}`);
    const result = await shell.openPath(logPath);

    if (result) {
      log.error(`Failed to open log file: ${result}`);
      return { success: false, error: result };
    }

    return { success: true };
  });
}
