/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { watch, readFileSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import log from 'electron-log/main';
import { EVENT_LOG_FILENAME, EVENT_FILE_POLL_INTERVAL_MS } from './config/constants';

export class EventFileReader {
  private filePath: string;
  private filePosition = 0;
  private watcher?: ReturnType<typeof watch>;
  private pollInterval?: NodeJS.Timeout;
  private onEventCallback?: (topic: string, message: string) => void;

  constructor(customFilePath?: string) {
    if (customFilePath) {
      this.filePath = customFilePath;
    } else {
      const rgfxDir = join(homedir(), '.rgfx');

      try {
        mkdirSync(rgfxDir, { recursive: true });
      } catch (err) {
        log.error('Failed to create .rgfx directory:', err);
      }
      this.filePath = join(rgfxDir, EVENT_LOG_FILENAME);
    }
    log.info(`Event file path: ${this.filePath}`);
  }

  start(onEvent: (topic: string, message: string) => void) {
    log.info('Starting event file reader...');
    this.onEventCallback = onEvent;
    this.checkForFile();
  }

  private checkForFile() {
    if (!this.onEventCallback) {
      return;
    }

    if (existsSync(this.filePath)) {
      // [A] File exists - set position to end and start watching
      try {
        const stats = statSync(this.filePath);
        this.filePosition = stats.size;
        log.info(`Event file found. Starting from position ${this.filePosition}`);
        this.startWatching();
      } catch (err) {
        log.error('Error checking file size:', err);
        this.startPolling();
      }
    } else {
      // [B] File doesn't exist - poll every 5 seconds
      log.info("Event file doesn't exist yet. Polling...");
      this.startPolling();
    }
  }

  private startWatching() {
    // Stop polling if active
    this.stopPolling();

    try {
      this.watcher = watch(this.filePath, (eventType) => {
        if (eventType === 'change' && this.onEventCallback) {
          this.readNewLines();
        }
      });

      this.watcher.on('error', (err) => {
        log.error('Watch error:', err);
        this.handleError();
      });

      log.info('File watcher started');
    } catch (err) {
      log.error('Failed to start watcher:', err);
      this.handleError();
    }
  }

  private startPolling() {
    this.stopWatching();

    if (!this.pollInterval) {
      this.pollInterval = setInterval(() => {
        if (existsSync(this.filePath)) {
          log.info('Event file appeared');
          this.checkForFile();
        }
      }, EVENT_FILE_POLL_INTERVAL_MS);
      log.info(`Polling for file every ${EVENT_FILE_POLL_INTERVAL_MS}ms`);
    }
  }

  private stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
      log.debug('File watcher stopped');
    }
  }

  private stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
      log.debug('Polling stopped');
    }
  }

  private handleError() {
    // [C] Read error - stop watching and start polling
    log.warn('Error occurred, switching to polling mode');
    this.stopWatching();
    this.filePosition = 0;
    this.startPolling();
  }

  private readNewLines() {
    if (!this.onEventCallback) {
      return;
    }

    try {
      if (!existsSync(this.filePath)) {
        log.info('Event file disappeared');
        this.handleError();
        return;
      }

      const stats = statSync(this.filePath);
      const currentSize = stats.size;

      // File was truncated - skip to end
      if (currentSize < this.filePosition) {
        log.info('File truncated, skipping to end');
        this.filePosition = currentSize;
      }

      // Read new data
      if (currentSize > this.filePosition) {
        const buffer = readFileSync(this.filePath);
        const newData = buffer.toString('utf-8', this.filePosition, currentSize);
        this.filePosition = currentSize;

        const lines = newData.split('\n').filter((line) => line.trim().length > 0);

        if (lines.length > 0) {
          log.debug(`Processing ${lines.length} event(s)`);
        }

        for (const line of lines) {
          const firstSpaceIndex = line.indexOf(' ');

          if (firstSpaceIndex > 0) {
            const topic = line.substring(0, firstSpaceIndex);
            const message = line.substring(firstSpaceIndex + 1);
            log.debug(`Event read: ${topic} = ${message}`);
            this.onEventCallback(topic, message);
          } else {
            log.debug(`Event read: ${line} (no payload)`);
            this.onEventCallback(line, '');
          }
        }
      }
    } catch (err) {
      log.error('Error reading event file:', err);
      this.handleError();
    }
  }

  stop() {
    this.onEventCallback = undefined;
    this.stopWatching();
    this.stopPolling();
    log.info('Event file reader stopped');
  }
}
