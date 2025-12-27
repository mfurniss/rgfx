/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain } from 'electron';
import log from 'electron-log/main';

interface ResetEventCountsHandlerDeps {
  resetEventsProcessed: () => void;
}

export function registerResetEventCountsHandler(deps: ResetEventCountsHandlerDeps): void {
  const { resetEventsProcessed } = deps;
  log.info('[ResetEventCountsHandler] Registering event:reset IPC handler');

  ipcMain.handle('event:reset', () => {
    log.info('[ResetEventCountsHandler] Resetting events processed counter');
    resetEventsProcessed();
  });
}
