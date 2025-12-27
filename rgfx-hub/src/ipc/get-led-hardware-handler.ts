/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain } from 'electron';
import type { LEDHardwareManager } from '../led-hardware-manager';
import type { LEDHardware } from '../types';

interface GetLEDHardwareHandlerDeps {
  ledHardwareManager: LEDHardwareManager;
}

export function registerGetLEDHardwareHandler(deps: GetLEDHardwareHandlerDeps): void {
  const { ledHardwareManager } = deps;

  ipcMain.handle('led-hardware:get', (_event, hardwareRef: string): LEDHardware | null => {
    return ledHardwareManager.loadHardware(hardwareRef);
  });
}
