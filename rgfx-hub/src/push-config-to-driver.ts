/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import log from 'electron-log/main';
import type { DriverRegistry } from './driver-registry';
import type { DriverPersistence } from './driver-persistence';
import type { LEDHardwareManager } from './led-hardware-manager';
import type { Mqtt } from './mqtt';

interface PushConfigDeps {
  driverRegistry: DriverRegistry;
  driverPersistence: DriverPersistence;
  ledHardwareManager: LEDHardwareManager;
  mqtt: Mqtt;
}

export function createPushConfigToDriver(deps: PushConfigDeps): (macAddress: string) => Promise<void> {
  const { driverRegistry, driverPersistence, ledHardwareManager, mqtt } = deps;

  return async function pushConfigToDriver(macAddress: string): Promise<void> {
    const driver = driverRegistry.getDriverByMac(macAddress);
    if (!driver) {
      throw new Error(`No driver found with MAC ${macAddress}`);
    }

    const driverId = driver.id;

    const ledConfig = driverPersistence.getLEDConfig(driverId);

    if (!ledConfig) {
      throw new Error(`Driver ${driverId} has no LED configuration`);
    }

    const hardware = ledHardwareManager.loadHardware(ledConfig.hardwareRef);

    if (!hardware) {
      throw new Error(`Failed to load LED hardware: ${ledConfig.hardwareRef}`);
    }

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
          count: hardware.count,
          offset: ledConfig.offset ?? 0,
          chipset: hardware.chipset,
          color_order: hardware.colorOrder,
          max_brightness: ledConfig.maxBrightness,
          color_correction: hardware.colorCorrection,
          width: hardware.width,
          height: hardware.height,
        },
      ],
      settings: {
        global_brightness_limit: ledConfig.globalBrightnessLimit,
        dithering: ledConfig.dithering,
        power_supply_volts: ledConfig.powerSupplyVolts,
        max_power_milliamps: ledConfig.maxPowerMilliamps,
      },
    };

    const topic = `rgfx/driver/${macAddress}/config`;
    const payload = JSON.stringify(completeConfig);

    await mqtt.publish(topic, payload);
    log.info(`Pushed LED configuration to driver ${driverId}: ${hardware.name} (${hardware.sku})`);
  };
}
