/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { ipcMain } from 'electron';
import log from 'electron-log/main';
import type { DriverConfig } from '../driver-config';
import type { DriverRegistry } from '../driver-registry';
import type { MqttBroker } from '../network';
import { ConfiguredDriverSchema, type ConfiguredDriverFromSchema } from '../schemas';
import { eventBus } from '../services/event-bus';
import { rebootDriver } from '../services/driver-service';

interface SaveDriverConfigHandlerDeps {
  driverConfig: DriverConfig;
  driverRegistry: DriverRegistry;
  mqtt: MqttBroker;
  uploadConfigToDriver: (macAddress: string) => Promise<boolean>;
}

export function registerSaveDriverConfigHandler(deps: SaveDriverConfigHandlerDeps): void {
  const { driverConfig, driverRegistry, mqtt, uploadConfigToDriver } = deps;

  ipcMain.handle('driver:save-config', async (_event, config: ConfiguredDriverFromSchema) => {
    const { macAddress } = config;
    log.info(`Save config requested for driver with MAC ${macAddress}`);

    // Validate with Zod schema
    const result = ConfiguredDriverSchema.safeParse(config);

    if (!result.success) {
      const errorMessage = result.error.issues.map((i) => i.message).join(', ');
      log.error(`Invalid driver config: ${errorMessage}`);
      throw new Error(`Invalid driver configuration: ${errorMessage}`);
    }

    const validConfig = result.data;

    // Look up driver by MAC address (immutable hardware identifier)
    const existingDriver = driverConfig.getDriverByMac(macAddress);

    if (!existingDriver) {
      throw new Error(`Driver with MAC ${macAddress} not found`);
    }

    const oldId = existingDriver.id;
    const newId = validConfig.id;

    if (newId !== oldId) {
      // Check new ID doesn't already exist
      if (driverConfig.getDriver(newId)) {
        throw new Error(`Driver ID "${newId}" already exists`);
      }

      // Create new driver with new ID, copy all settings
      driverConfig.addDriver(newId, existingDriver.macAddress);

      if (existingDriver.description) {
        driverConfig.updateDriver(newId, { description: existingDriver.description });
      }

      if (existingDriver.ledConfig) {
        driverConfig.setLEDConfig(newId, existingDriver.ledConfig);
      }

      driverConfig.setRemoteLogging(newId, existingDriver.remoteLogging);

      // Delete old driver
      driverConfig.deleteDriver(oldId);
      log.info(`Driver renamed from ${oldId} to ${newId}`);
    }

    // Use the current ID (new if renamed)
    const currentId = newId;

    // Update description if changed
    if (validConfig.description !== existingDriver.description) {
      driverConfig.updateDriver(currentId, { description: validConfig.description });
    }

    // Update LED config if provided (merge with existing to preserve fields not in the form)
    if (validConfig.ledConfig) {
      const mergedLedConfig = {
        ...existingDriver.ledConfig,
        ...validConfig.ledConfig,
      };
      driverConfig.setLEDConfig(currentId, mergedLedConfig);
    }

    // Update remoteLogging if changed
    if (validConfig.remoteLogging !== existingDriver.remoteLogging) {
      driverConfig.setRemoteLogging(currentId, validConfig.remoteLogging);
    }

    log.info(`Driver ${currentId} config saved successfully`);

    // Refresh the runtime driver registry from persistence
    const updatedDriver = driverRegistry.refreshDriverFromConfig(macAddress);

    // Notify renderer of the updated driver via event bus
    if (updatedDriver) {
      eventBus.emit('driver:updated', { driver: updatedDriver });
      log.info(`Emitted driver:updated event for ${currentId}`);

      // If driver is connected, push the new config to the device and reboot
      if (updatedDriver.state === 'connected') {
        log.info(`Driver ${currentId} is connected, uploading new config...`);

        // Upload config and wait for driver to confirm it saved to NVS
        const configSaved = await uploadConfigToDriver(macAddress);

        if (configSaved) {
          // Wait 1 second after confirmation to ensure config is fully persisted
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Reboot the driver so it applies the new config (FastLED can't reinitialize)
        log.info(`Rebooting driver ${currentId} to apply new config...`);
        await rebootDriver(updatedDriver, { mqtt });

        return { success: true, driverRebooted: true };
      }
    }

    return { success: true, driverRebooted: false };
  });
}
