/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain, type BrowserWindow } from 'electron';
import log from 'electron-log/main';
import type { DriverPersistence } from '../driver-persistence';
import type { DriverRegistry } from '../driver-registry';
import type { LEDHardwareManager } from '../led-hardware-manager';
import type { MqttBroker } from '../network';
import { PersistedDriverSchema, type PersistedDriverFromSchema } from '../schemas';
import { serializeDriverForIPC } from '../types';

interface SaveDriverConfigHandlerDeps {
  driverPersistence: DriverPersistence;
  driverRegistry: DriverRegistry;
  ledHardwareManager: LEDHardwareManager;
  mqtt: MqttBroker;
  uploadConfigToDriver: (macAddress: string) => Promise<void>;
  getMainWindow: () => BrowserWindow | null;
}

export function registerSaveDriverConfigHandler(deps: SaveDriverConfigHandlerDeps): void {
  const {
    driverPersistence, driverRegistry, ledHardwareManager, mqtt,
    uploadConfigToDriver, getMainWindow,
  } = deps;

  ipcMain.handle('driver:save-config', async (_event, config: PersistedDriverFromSchema) => {
    const { macAddress } = config;
    log.info(`Save config requested for driver with MAC ${macAddress}`);

    // Validate with Zod schema
    const result = PersistedDriverSchema.safeParse(config);

    if (!result.success) {
      const errorMessage = result.error.issues.map((i) => i.message).join(', ');
      log.error(`Invalid driver config: ${errorMessage}`);
      throw new Error(`Invalid driver configuration: ${errorMessage}`);
    }

    const validConfig = result.data;

    // Look up driver by MAC address (immutable hardware identifier)
    const existingDriver = driverPersistence.getDriverByMac(macAddress);

    if (!existingDriver) {
      throw new Error(`Driver with MAC ${macAddress} not found`);
    }

    const oldId = existingDriver.id;
    const newId = validConfig.id;
    const isRename = newId !== oldId;

    if (isRename) {
      // Check new ID doesn't already exist
      if (driverPersistence.getDriver(newId)) {
        throw new Error(`Driver ID "${newId}" already exists`);
      }

      // Create new driver with new ID, copy all settings
      driverPersistence.addDriver(newId, existingDriver.macAddress);

      if (existingDriver.description) {
        driverPersistence.updateDriver(newId, { description: existingDriver.description });
      }

      if (existingDriver.ledConfig) {
        driverPersistence.setLEDConfig(newId, existingDriver.ledConfig);
      }

      driverPersistence.setRemoteLogging(newId, existingDriver.remoteLogging);

      // Delete old driver
      driverPersistence.deleteDriver(oldId);
      log.info(`Driver renamed from ${oldId} to ${newId}`);
    }

    // Use the current ID (new if renamed)
    const currentId = newId;

    // Update description if changed
    if (validConfig.description !== existingDriver.description) {
      driverPersistence.updateDriver(currentId, { description: validConfig.description });
    }

    // Update LED config if provided (merge with existing to preserve fields not in the form)
    if (validConfig.ledConfig) {
      const mergedLedConfig = {
        ...existingDriver.ledConfig,
        ...validConfig.ledConfig,
      };
      driverPersistence.setLEDConfig(currentId, mergedLedConfig);
    }

    // Update remoteLogging if changed
    if (validConfig.remoteLogging !== existingDriver.remoteLogging) {
      driverPersistence.setRemoteLogging(currentId, validConfig.remoteLogging);
    }

    log.info(`Driver ${currentId} config saved successfully`);

    // Refresh the runtime driver registry from persistence
    const updatedDriver =
      driverRegistry.refreshDriverFromPersistence(macAddress, ledHardwareManager);

    // Notify renderer of the updated driver
    if (updatedDriver) {
      const mainWindow = getMainWindow();

      if (mainWindow) {
        mainWindow.webContents.send('driver:updated', serializeDriverForIPC(updatedDriver));
        log.info(`Sent driver:updated to renderer for ${currentId}`);
      }

      // If driver is connected, push the new config to the device and reboot
      if (updatedDriver.connected) {
        log.info(`Driver ${currentId} is connected, uploading new config...`);
        await uploadConfigToDriver(macAddress);

        // Reboot the driver so it applies the new config (FastLED can't reinitialize)
        log.info(`Rebooting driver ${currentId} to apply new config...`);
        const rebootTopic = `rgfx/driver/${currentId}/reboot`;
        await mqtt.publish(rebootTopic, '');

        return { success: true, driverRebooted: true };
      }
    }

    return { success: true, driverRebooted: false };
  });
}
