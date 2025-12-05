/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { TransformerEngine } from '../transformer-engine';

interface SimulateEventHandlerDeps {
  transformerEngine: TransformerEngine;
  onEventProcessed: (topic: string, payload: string) => void;
}

export function registerSimulateEventHandler(deps: SimulateEventHandlerDeps): void {
  const { transformerEngine, onEventProcessed } = deps;
  log.info('[SimulateEventHandler] Registering event:simulate IPC handler');

  ipcMain.handle('event:simulate', async (_event, eventLine: string) => {
    log.info(`[SimulateEventHandler] Simulating event: ${eventLine}`);

    // Parse event line: format is "topic payload" (space-delimited)
    const spaceIndex = eventLine.indexOf(' ');
    let topic: string;
    let payload: string;

    if (spaceIndex === -1) {
      // No payload, just topic
      topic = eventLine.trim();
      payload = '';
    } else {
      topic = eventLine.substring(0, spaceIndex);
      payload = eventLine.substring(spaceIndex + 1);
    }

    if (!topic) {
      throw new Error('Invalid event line: topic is required');
    }

    // Process the event through the transformer engine
    await transformerEngine.handleEvent(topic, payload);

    // Update event statistics
    onEventProcessed(topic, payload);

    log.info(`[SimulateEventHandler] Event simulated successfully: ${topic} ${payload}`);
  });
}
