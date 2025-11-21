/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { UdpClient, EffectPayload } from '../types/mapping-types';

interface TriggerEffectHandlerDeps {
  udpClient: UdpClient;
}

export function registerTriggerEffectHandler(deps: TriggerEffectHandlerDeps): void {
  const { udpClient } = deps;

  ipcMain.handle('effect:trigger', (_event, payload: EffectPayload) => {
    log.info(`Manual effect trigger requested: ${payload.effect}`, payload);

    try {
      udpClient.broadcast(payload);
      log.info(`Effect broadcast successful: ${payload.effect}`);
    } catch (error) {
      log.error('Failed to broadcast effect:', error);
      throw error;
    }
  });
}
