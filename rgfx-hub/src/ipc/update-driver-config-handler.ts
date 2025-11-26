/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { DriverRegistry } from '../driver-registry';

interface UploadDriverConfigHandlerDeps {
  driverRegistry: DriverRegistry;
  uploadConfigToDriver: (macAddress: string) => Promise<void>;
}

export function registerUpdateDriverConfigHandler(deps: UploadDriverConfigHandlerDeps): void {
  const { driverRegistry, uploadConfigToDriver } = deps;

  ipcMain.handle('driver:update-config', async (_event, driverId: string) => {
    log.info(`Update config requested for driver ${driverId}`);

    const driver = driverRegistry.getDriver(driverId);
    if (!driver) {
      throw new Error(`No driver found with ID ${driverId}`);
    }

    if (!driver.mac) {
      throw new Error(`Driver ${driverId} has no MAC address`);
    }

    log.info(`Updating LED configuration for driver ${driverId}...`);
    await uploadConfigToDriver(driver.mac);
    log.info(`Configuration updated for driver ${driverId}`);
  });
}
