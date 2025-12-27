/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';
import type { DriverPersistence } from './driver-persistence';
import type { LEDHardwareManager } from './led-hardware-manager';
import type { MqttBroker } from './network';

interface UploadConfigDeps {
  driverPersistence: DriverPersistence;
  ledHardwareManager: LEDHardwareManager;
  mqtt: MqttBroker;
}

/** Config save confirmation timeout in milliseconds */
const CONFIG_SAVE_TIMEOUT_MS = 5000;

export function createUploadConfigToDriver(
  deps: UploadConfigDeps,
): (macAddress: string) => Promise<boolean> {
  const { driverPersistence, ledHardwareManager, mqtt } = deps;

  /**
   * Upload LED configuration to driver and wait for save confirmation.
   * @returns true if driver confirmed config saved, false if timeout
   */
  return async function uploadConfigToDriver(macAddress: string): Promise<boolean> {
    // Look up persisted driver by MAC (source of truth for config)
    const persistedDriver = driverPersistence.getDriverByMac(macAddress);

    if (!persistedDriver) {
      throw new Error(`No driver found with MAC ${macAddress}`);
    }

    const { id: driverId, ledConfig } = persistedDriver;

    if (!ledConfig) {
      throw new Error(`Driver ${driverId} has no LED configuration`);
    }

    const hardware = ledHardwareManager.loadHardware(ledConfig.hardwareRef);

    if (!hardware) {
      throw new Error(`Failed to load LED hardware: ${ledConfig.hardwareRef}`);
    }

    // Calculate unified display dimensions
    const { unified } = ledConfig;
    const unifiedRows = unified ? unified.length : 1;
    const unifiedCols = unified ? unified[0].length : 1;
    const panelCount = unifiedRows * unifiedCols;

    // Effective dimensions for the unified display
    const effectiveWidth = (hardware.width ?? hardware.count) * unifiedCols;
    const effectiveHeight = (hardware.height ?? 1) * unifiedRows;
    const effectiveCount = hardware.count * panelCount;

    const completeConfig = {
      id: driverId,
      name: hardware.name,
      description: hardware.description,
      version: '1.0',
      led_devices: [
        {
          id: 'device1',
          name: hardware.name,
          pin: ledConfig.pin,
          layout: hardware.layout,
          count: effectiveCount,
          offset: ledConfig.offset ?? 0,
          chipset: hardware.chipset,
          color_order: hardware.colorOrder,
          max_brightness: ledConfig.maxBrightness,
          color_correction: hardware.colorCorrection,
          width: effectiveWidth,
          height: effectiveHeight,
          // Unified panel configuration (null if single panel)
          panel_width: unified ? hardware.width : undefined,
          panel_height: unified ? hardware.height : undefined,
          unified,
        },
      ],
      settings: {
        global_brightness_limit: ledConfig.globalBrightnessLimit,
        dithering: ledConfig.dithering,
        power_supply_volts: ledConfig.powerSupplyVolts,
        max_power_milliamps: ledConfig.maxPowerMilliamps,
        gamma_r: ledConfig.gamma?.r ?? 1.0,
        gamma_g: ledConfig.gamma?.g ?? 1.0,
        gamma_b: ledConfig.gamma?.b ?? 1.0,
        floor_r: ledConfig.floor.r,
        floor_g: ledConfig.floor.g,
        floor_b: ledConfig.floor.b,
      },
    };

    const configTopic = `rgfx/driver/${macAddress}/config`;
    const responseTopic = `rgfx/driver/${macAddress}/config/saved`;
    const payload = JSON.stringify(completeConfig);

    // Log the unified array being sent for debugging
    if (unified) {
      log.info(`Uploading unified config: ${JSON.stringify(unified)}`);
    }

    // Publish config and wait for driver to confirm it saved to NVS
    const response = await mqtt.publishAndAwaitResponse(
      configTopic,
      payload,
      responseTopic,
      CONFIG_SAVE_TIMEOUT_MS,
    );

    log.info(`Uploaded LED configuration to driver ${driverId}: ${hardware.name} (${hardware.sku})`);
    log.info(`  globalBrightnessLimit: ${ledConfig.globalBrightnessLimit}`);

    if (response) {
      log.info(`Driver ${driverId} confirmed config saved to NVS`);
      return true;
    }

    log.warn(`Driver ${driverId} did not confirm config save within ${CONFIG_SAVE_TIMEOUT_MS}ms`);
    return false;
  };
}
