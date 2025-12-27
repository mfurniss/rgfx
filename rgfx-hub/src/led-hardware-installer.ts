/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

/**
 * LED Hardware Installer
 *
 * Manages installation of default LED hardware definitions to user config directory.
 * Default hardware files are shipped with the app in assets/led-hardware/
 * and copied to user directory on first run. Existing files are never overwritten.
 */

import { app } from 'electron';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import log from 'electron-log/main';
import { LED_HARDWARE_DIRECTORY } from './config/paths';

/**
 * Get the bundled LED hardware directory
 * (assets/led-hardware in development, Resources/assets/led-hardware in production)
 */
function getBundledLedHardwareDir(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'assets', 'led-hardware');
  } else {
    return join(app.getAppPath(), 'assets', 'led-hardware');
  }
}

/**
 * Install default LED hardware definitions to user config directory if they don't exist
 */
export async function installDefaultLedHardware(): Promise<void> {
  const bundledDir = getBundledLedHardwareDir();
  const userDir = LED_HARDWARE_DIRECTORY;

  try {
    log.info(`Copying default LED hardware from: ${bundledDir}`);
    log.info(`Installing to: ${userDir}`);

    await fs.mkdir(userDir, { recursive: true });

    const entries = await fs.readdir(bundledDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) {
        continue;
      }

      const srcPath = join(bundledDir, entry.name);
      const destPath = join(userDir, entry.name);

      try {
        await fs.access(destPath);
        log.debug(`LED hardware already exists, skipping: ${entry.name}`);
      } catch {
        await fs.copyFile(srcPath, destPath);
        log.info(`Installed LED hardware: ${entry.name}`);
      }
    }

    log.info('LED hardware installation complete');
  } catch (error) {
    log.error('Failed to install LED hardware:', error);
    throw error;
  }
}
