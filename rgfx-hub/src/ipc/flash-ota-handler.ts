import { ipcMain, app } from 'electron';
import path from 'node:path';
import log from 'electron-log/main';
import type { DriverRegistry } from '../driver-registry';
import { INVOKE_CHANNELS } from './contract';
import { eventBus } from '../services/event-bus';
import { setActiveOtaDriver, clearActiveOtaDriver } from '../services/global-error-handler';
import {
  type SupportedChip,
  getOtaFirmwareFilename,
  mapChipNameToVariant,
} from '../schemas/firmware-manifest';

interface FlashOtaHandlerDeps {
  driverRegistry: DriverRegistry;
}

/**
 * Validate and map driver's chip model to supported chip type
 */
function getChipType(chipModel: string | undefined): SupportedChip {
  if (!chipModel) {
    throw new Error(
      'Driver chip type unknown. Cannot determine correct firmware. ' +
      'The driver may be running old firmware that does not report chip type.',
    );
  }

  const chipType = mapChipNameToVariant(chipModel);

  if (!chipType) {
    throw new Error(
      `Unsupported chip type: ${chipModel}. Supported: ESP32, ESP32-S3`,
    );
  }

  return chipType;
}

/**
 * Get the firmware file path for a specific chip type
 */
function getFirmwarePath(chipType: SupportedChip): string {
  const filename = getOtaFirmwareFilename(chipType);

  return app.isPackaged
    ? path.join(process.resourcesPath, 'firmware', filename)
    : path.join(app.getAppPath(), 'assets', 'esp32', 'firmware', filename);
}

export function registerFlashOtaHandler(deps: FlashOtaHandlerDeps): void {
  const { driverRegistry } = deps;

  ipcMain.handle(INVOKE_CHANNELS.flashOTA, async (_event, driverId: string): Promise<void> => {
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

    // Determine chip type and firmware path
    const chipType = getChipType(driver.telemetry?.chipModel);
    const firmwarePath = getFirmwarePath(chipType);

    log.info(`Starting OTA flash to ${driverId} (${ipAddress}), chip: ${chipType}...`);

    // Track active OTA driver for error context in global error handler
    setActiveOtaDriver(driverId);

    // Mark driver as updating - this prevents LWT "offline" from disconnecting it
    // and shows "Updating" state in the UI
    driver.state = 'updating';
    eventBus.emit('driver:updated', { driver });

    // Touch driver immediately at OTA start to reset timeout
    driverRegistry.touchDriver(driverId);

    const fs = await import('fs');

    if (!fs.existsSync(firmwarePath)) {
      throw new Error(`Firmware file not found for ${chipType}: ${firmwarePath}`);
    }

    const EspOTA = (await import('esp-ota')).default;
    const esp = new EspOTA();

    // Note: Socket errors (ECONNRESET, etc.) are handled by the global error handler
    // in global-error-handler.ts. The esp.on('error') handler below handles errors
    // emitted by the esp-ota library for UI feedback.

    esp.on('state', (state: string) => {
      log.info(`OTA state: ${state}`);

      // Touch driver on state changes to prevent heartbeat timeout
      driverRegistry.touchDriver(driverId);

      eventBus.emit('flash:ota:state', { driverId, state });
    });

    let lastPercent = -1;
    // Object property avoids TS narrowing the callback-mutated value as always-false
    const progressState = { reachedFull: false };
    esp.on('progress', (data: { sent: number; total: number }) => {
      const percent = Math.round((data.sent / data.total) * 100);

      if (percent !== lastPercent) {
        log.info(`OTA progress: ${driverId} ${percent}%`);

        if (percent >= 100) {
          progressState.reachedFull = true;
        }

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

    // Handle errors from esp-ota library for UI feedback (modal dialog)
    // SystemErrors for the System Errors panel are emitted by global-error-handler.ts
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

      log.info(`OTA flash to ${driverId} (${chipType}) completed successfully`);

      // Re-fetch driver from registry - the reference may have been replaced
      // by telemetry events during OTA upload (race condition)
      const updatedDriver = driverRegistry.getDriver(driverId);

      if (updatedDriver) {
        updatedDriver.state = 'disconnected';
        updatedDriver.ip = undefined;
        eventBus.emit('driver:disconnected', { driver: updatedDriver, reason: 'restarting' });
      }
    } catch (error) {
      const err = error as Error;

      // If we reached 100% progress and got a timeout, the firmware was actually
      // flashed successfully - the ESP32 just rebooted before sending confirmation
      if (progressState.reachedFull && err.message.toLowerCase().includes('timeout')) {
        log.info(`OTA flash to ${driverId} completed (device rebooted before confirmation)`);
        const updatedDriver = driverRegistry.getDriver(driverId);

        if (updatedDriver) {
          updatedDriver.state = 'disconnected';
          updatedDriver.ip = undefined;
          eventBus.emit('driver:disconnected', { driver: updatedDriver, reason: 'restarting' });
        }

        return;
      }

      // Real error - mark driver as disconnected and re-throw
      const errorDriver = driverRegistry.getDriver(driverId);

      if (errorDriver) {
        errorDriver.state = 'disconnected';
        eventBus.emit('driver:updated', { driver: errorDriver });
      }

      throw error;
    } finally {
      // Clear active OTA driver tracking regardless of success/failure
      clearActiveOtaDriver();
    }
  });
}
