/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import dgram from 'dgram';
import { ipcMain } from 'electron';
import log from 'electron-log/main';
import { UDP_PORT } from '../config/constants';
import type { UdpClient, EffectPayload } from '../types/transformer-types';

interface TriggerEffectHandlerDeps {
  udpClient: UdpClient;
}

export function registerTriggerEffectHandler(deps: TriggerEffectHandlerDeps): void {
  const { udpClient } = deps;
  log.info('[TriggerEffectHandler] Registering effect:trigger IPC handler');

  // Socket for sending to localhost (led-sim)
  const localhostSocket = dgram.createSocket('udp4');

  ipcMain.handle('effect:trigger', (_event, payload: EffectPayload) => {
    try {
      // Send to registered drivers FIRST - minimize latency
      udpClient.broadcast(payload);

      // Also send to localhost for led-sim
      const { drivers: _targetDriverIds, ...effectData } = payload;
      const message = Buffer.from(JSON.stringify(effectData));
      localhostSocket.send(message, UDP_PORT, '127.0.0.1');

      // Log AFTER sending to avoid blocking the hot path
      log.info(`Effect broadcast: ${payload.effect}`, payload);
    } catch (error) {
      log.error('Failed to broadcast effect:', error);
      throw error;
    }
  });
}
