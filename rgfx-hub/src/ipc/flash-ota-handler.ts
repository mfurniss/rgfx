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
import { eventBus } from '../services/event-bus';

interface FlashOtaHandlerDeps {
  driverRegistry: DriverRegistry;
}

export function registerFlashOtaHandler(deps: FlashOtaHandlerDeps): void {
  const { driverRegistry } = deps;

  ipcMain.handle('driver:flash-ota', async (_event, driverId: string): Promise<void> => {
    const driver = driverRegistry.getDriver(driverId);

    if (!driver) {
      throw new Error('Driver not found');
    }

    if (driver.state !== 'connected') {
      throw new Error('Driver is not connected');
    }

    const ipAddress = driver.ip;

    if (!ipAddress) {
      throw new Error('Driver IP address not available');
    }

    log.info(`Starting OTA flash to ${driverId} (${ipAddress})...`);

    // Mark driver as updating - this prevents LWT "offline" from disconnecting it
    // and shows "Updating" state in the UI
    driver.state = 'updating';
    eventBus.emit('driver:updated', { driver });

    // Touch driver immediately at OTA start to reset timeout
    driverRegistry.touchDriver(driverId);

    const firmwarePath = app.isPackaged
      ? path.join(process.resourcesPath, 'firmware', 'firmware.bin')
      : path.join(app.getAppPath(), 'assets', 'esp32', 'firmware', 'firmware.bin');

    const fs = await import('fs');

    if (!fs.existsSync(firmwarePath)) {
      throw new Error(`Firmware file not found: ${firmwarePath}`);
    }

    const EspOTA = (await import('esp-ota')).default;
    const esp = new EspOTA();

    esp.on('state', (state: string) => {
      log.info(`OTA state: ${state}`);

      // Touch driver on state changes to prevent heartbeat timeout
      driverRegistry.touchDriver(driverId);

      eventBus.emit('flash:ota:state', { driverId, state });
    });

    let lastPercent = -1;
    esp.on('progress', (data: { sent: number; total: number }) => {
      const percent = Math.round((data.sent / data.total) * 100);

      if (percent !== lastPercent) {
        log.info(`OTA progress: ${driverId} ${percent}%`);

        // Touch driver to keep it marked as connected during OTA
        // (OTA activity proves the driver is still responsive)
        driverRegistry.touchDriver(driverId);

        eventBus.emit('flash:ota:progress', {
          driverId,
          sent: data.sent,
          total: data.total,
          percent,
        });
        lastPercent = percent;
      }
    });

    // Handle socket/connection errors to prevent uncaught exceptions
    const errorState = { error: null as Error | null };
    esp.on('error', (error: Error) => {
      log.error(`OTA error for ${driverId}:`, error.message);
      errorState.error = error;
      eventBus.emit('flash:ota:error', {
        driverId,
        error: error.message,
      });
    });

    try {
      await esp.uploadFile(firmwarePath, ipAddress, 3232, EspOTA.FLASH);

      // Check if an error occurred during upload (may not reject the promise)
      if (errorState.error) {
        throw errorState.error;
      }

      log.info(`OTA flash to ${driverId} completed successfully`);

      // Re-fetch driver from registry - the reference may have been replaced
      // by telemetry events during OTA upload (race condition)
      const updatedDriver = driverRegistry.getDriver(driverId);

      if (updatedDriver) {
        updatedDriver.state = 'disconnected';
        updatedDriver.ip = undefined;
        eventBus.emit('driver:disconnected', { driver: updatedDriver, reason: 'restarting' });
      }
    } catch (error) {
      // On error, try to mark driver as disconnected
      const errorDriver = driverRegistry.getDriver(driverId);

      if (errorDriver) {
        errorDriver.state = 'disconnected';
        eventBus.emit('driver:updated', { driver: errorDriver });
      }

      throw error;
    }
  });
}
