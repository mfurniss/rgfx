/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { TransformerEngine } from '../transformer-engine';

interface ClearTransformerStateHandlerDeps {
  transformerEngine: TransformerEngine;
}

export function registerClearTransformerStateHandler(deps: ClearTransformerStateHandlerDeps): void {
  const { transformerEngine } = deps;
  log.info('[ClearTransformerStateHandler] Registering transformer:clear-state IPC handler');

  ipcMain.handle('transformer:clear-state', () => {
    transformerEngine.clearState();
  });
}
