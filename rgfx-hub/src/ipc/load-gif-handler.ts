/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain, dialog } from 'electron';
import log from 'electron-log/main';
import { loadGif } from '../gif-loader';
import { eventBus } from '../services/event-bus';
import type { GifBitmapResult } from '../types/transformer-types';
import { INVOKE_CHANNELS } from './contract';

export function registerLoadGifHandler(): void {
  ipcMain.handle(INVOKE_CHANNELS.loadGif, async (): Promise<GifBitmapResult | null> => {
    const result = await dialog.showOpenDialog({
      title: 'Select GIF Image',
      filters: [
        { name: 'GIF Images', extensions: ['gif'] },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const filePath = result.filePaths[0];

    try {
      const gifResult = await loadGif(filePath);

      // Include the file path for code generation in the UI
      return { ...gifResult, filePath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error(`[LoadGifHandler] Failed to load GIF: ${filePath}`, error);

      eventBus.emit('system:error', {
        errorType: 'general',
        message: `Failed to load GIF: ${errorMessage}`,
        timestamp: Date.now(),
        filePath,
      });

      return null;
    }
  });
}
