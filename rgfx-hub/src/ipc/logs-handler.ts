/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain } from 'electron';
import type { LogManager, LogSizes } from '../log-manager';
import { INVOKE_CHANNELS } from './contract';

interface LogsHandlerDeps {
  logManager: LogManager;
}

export function registerLogsHandler(deps: LogsHandlerDeps): void {
  const { logManager } = deps;

  ipcMain.handle(INVOKE_CHANNELS.getLogSizes, async (): Promise<LogSizes> => {
    return logManager.getSizes();
  });

  ipcMain.handle(INVOKE_CHANNELS.clearAllLogs, async (): Promise<void> => {
    return logManager.clearAll();
  });
}
