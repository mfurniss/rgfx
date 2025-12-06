/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { watch, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { app } from 'electron';
import log from 'electron-log/main';
import { EventEmitter } from 'node:events';

const POLL_INTERVAL_MS = 5000;

export class FirmwareWatcher extends EventEmitter {
  private readonly firmwareDir: string;
  private watcher?: ReturnType<typeof watch>;
  private pollInterval?: NodeJS.Timeout;
  private currentVersion: string | null = null;

  constructor() {
    super();
    this.firmwareDir = app.isPackaged
      ? join(process.resourcesPath, 'firmware')
      : join(app.getAppPath(), 'assets', 'esp32', 'firmware');

    log.info('[FirmwareWatcher] Initialized');
    log.info('[FirmwareWatcher] Watching directory:', this.firmwareDir);
  }

  start(): void {
    log.info('[FirmwareWatcher] Starting firmware monitoring...');

    // Read initial version
    this.currentVersion = this.detectFirmwareVersion();

    if (this.currentVersion) {
      log.info('[FirmwareWatcher] Initial firmware version:', this.currentVersion);
    } else {
      log.warn('[FirmwareWatcher] No firmware found at startup');
    }

    // Start watching
    this.startWatching();
  }

  stop(): void {
    log.info('[FirmwareWatcher] Stopping firmware monitoring...');
    this.stopWatching();
    this.stopPolling();
  }

  getCurrentVersion(): string | null {
    return this.currentVersion;
  }

  private startWatching(): void {
    if (!existsSync(this.firmwareDir)) {
      log.warn('[FirmwareWatcher] Firmware directory does not exist:', this.firmwareDir);
      log.info('[FirmwareWatcher] Starting polling mode...');
      this.startPolling();
      return;
    }

    try {
      this.watcher = watch(this.firmwareDir, (eventType, filename) => {
        log.debug('[FirmwareWatcher] Directory event:', eventType, 'file:', filename);

        // Only process rgfx-firmware.*.bin files (ignore bootloader/partitions)
        if (filename?.startsWith('rgfx-firmware.') && filename.endsWith('.bin')) {
          log.info('[FirmwareWatcher] Detected firmware file change:', filename);
          this.checkForFirmwareUpdate();
        }
      });

      this.watcher.on('error', (err) => {
        log.error('[FirmwareWatcher] Watch error:', err);
        log.info('[FirmwareWatcher] Falling back to polling mode...');
        this.handleError();
      });

      log.info('[FirmwareWatcher] Directory watcher started successfully');
    } catch (err) {
      log.error('[FirmwareWatcher] Failed to start watcher:', err);
      log.info('[FirmwareWatcher] Falling back to polling mode...');
      this.startPolling();
    }
  }

  private startPolling(): void {
    this.stopWatching();

    if (!this.pollInterval) {
      this.pollInterval = setInterval(() => {
        log.debug('[FirmwareWatcher] Polling for firmware updates...');
        this.checkForFirmwareUpdate();
      }, POLL_INTERVAL_MS);

      log.info(`[FirmwareWatcher] Polling started (interval: ${POLL_INTERVAL_MS}ms)`);
    }
  }

  private stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = undefined;
      log.debug('[FirmwareWatcher] Watcher stopped');
    }
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = undefined;
      log.debug('[FirmwareWatcher] Polling stopped');
    }
  }

  private handleError(): void {
    this.stopWatching();
    this.startPolling();
  }

  private checkForFirmwareUpdate(): void {
    const newVersion = this.detectFirmwareVersion();

    if (newVersion !== this.currentVersion) {
      log.info('[FirmwareWatcher] *** FIRMWARE VERSION CHANGED ***');
      log.info('[FirmwareWatcher] Old version:', this.currentVersion ?? 'none');
      log.info('[FirmwareWatcher] New version:', newVersion ?? 'none');

      this.currentVersion = newVersion;
      this.emit('firmware-updated', newVersion);

      log.info('[FirmwareWatcher] Emitted firmware-updated event');
    }
  }

  private detectFirmwareVersion(): string | null {
    try {
      if (!existsSync(this.firmwareDir)) {
        log.debug('[FirmwareWatcher] Firmware directory does not exist');
        return null;
      }

      const files = readdirSync(this.firmwareDir);
      log.debug('[FirmwareWatcher] Files in directory:', files.length);

      // Find firmware file matching pattern: rgfx-firmware.{version}.bin
      const firmwareFile = files.find((f) => f.startsWith('rgfx-firmware.') && f.endsWith('.bin'));

      if (!firmwareFile) {
        log.debug('[FirmwareWatcher] No firmware file found matching pattern rgfx-firmware.*.bin');
        return null;
      }

      // Extract version from filename: rgfx-firmware.0.0.1-test.bin -> 0.0.1-test
      const version = firmwareFile.replace('rgfx-firmware.', '').replace('.bin', '');

      log.debug('[FirmwareWatcher] Detected firmware file:', firmwareFile);
      log.debug('[FirmwareWatcher] Extracted version:', version);

      return version;
    } catch (error) {
      log.error('[FirmwareWatcher] Error detecting firmware version:', error);
      return null;
    }
  }
}
