/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain, app } from 'electron';
import path from 'node:path';
import log from 'electron-log/main';
import type { DriverRegistry } from '../driver-registry';

interface FlashOtaHandlerDeps {
  driverRegistry: DriverRegistry;
}

export function registerFlashOtaHandler(deps: FlashOtaHandlerDeps): void {
  const { driverRegistry } = deps;

  ipcMain.handle('driver:flash-ota', async (_event, driverId: string) => {
    try {
      const driver = driverRegistry.getDriver(driverId);
      if (!driver) {
        throw new Error('Driver not found');
      }

      if (!driver.connected) {
        throw new Error('Driver is not connected');
      }

      const ipAddress = driver.ip;
      if (!ipAddress) {
        throw new Error('Driver IP address not available');
      }

      log.info(`Starting OTA flash to ${driverId} (${ipAddress})...`);

      const firmwarePath = app.isPackaged
        ? path.join(process.resourcesPath, 'firmware', 'firmware.bin')
        : path.join(app.getAppPath(), 'public', 'esp32', 'firmware', 'firmware.bin');

      const fs = await import('fs');
      if (!fs.existsSync(firmwarePath)) {
        throw new Error(`Firmware file not found: ${firmwarePath}`);
      }

      const EspOTA = (await import('esp-ota')).default;
      const esp = new EspOTA();

      esp.on('state', (state: string) => {
        log.info(`OTA state: ${state}`);
      });

      let lastPercent = -1;
      esp.on('progress', (data: { sent: number; total: number }) => {
        const percent = Math.round((data.sent / data.total) * 100);
        if (percent !== lastPercent) {
          log.info(`OTA progress: ${percent}%`);
          lastPercent = percent;
        }
      });

      await esp.uploadFile(firmwarePath, ipAddress, 3232, EspOTA.FLASH);

      log.info(`OTA flash to ${driverId} completed successfully`);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log.error('OTA flash failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });
}
