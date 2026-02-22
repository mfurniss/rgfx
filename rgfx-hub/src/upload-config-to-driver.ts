import log from 'electron-log/main';
import type { DriverConfig } from './driver-config';
import type { LEDHardwareManager } from './led-hardware-manager';
import type { MqttBroker } from './network';

interface UploadConfigDeps {
  driverConfig: DriverConfig;
  ledHardwareManager: LEDHardwareManager;
  mqtt: MqttBroker;
}

/** Config save confirmation timeout in milliseconds */
const CONFIG_SAVE_TIMEOUT_MS = 5000;

export function createUploadConfigToDriver(
  deps: UploadConfigDeps,
): (macAddress: string) => Promise<boolean> {
  const { driverConfig, ledHardwareManager, mqtt } = deps;

  /**
   * Upload LED configuration to driver and wait for save confirmation.
   * @returns true if driver confirmed config saved, false if timeout
   */
  return async function uploadConfigToDriver(macAddress: string): Promise<boolean> {
    // Look up persisted driver by MAC (source of truth for config)
    const configuredDriver = driverConfig.getDriverByMac(macAddress);

    if (!configuredDriver) {
      throw new Error(`No driver found with MAC ${macAddress}`);
    }

    const { id: driverId, ledConfig } = configuredDriver;

    if (!ledConfig) {
      throw new Error(`Driver ${driverId} has no LED configuration`);
    }

    const hardware = ledHardwareManager.loadHardware(ledConfig.hardwareRef);

    if (!hardware) {
      throw new Error(`Failed to load LED hardware: ${ledConfig.hardwareRef}`);
    }

    // Calculate unified display dimensions
    // Convert single-panel rotation to 1x1 unified array
    const { unified, rotation } = ledConfig;

    let effectiveUnified = unified;

    if (!unified && rotation && rotation !== '0') {
      const rotationMap: Record<string, string> = {
        '90': 'b',
        '180': 'c',
        '270': 'd',
      };
      effectiveUnified = [[`0${rotationMap[rotation]}`]];
    }
    const unifiedRows = effectiveUnified ? effectiveUnified.length : 1;
    const unifiedCols = effectiveUnified ? effectiveUnified[0].length : 1;
    const panelCount = unifiedRows * unifiedCols;

    // Effective dimensions for the unified display
    const effectiveWidth = (hardware.width ?? hardware.count) * unifiedCols;
    const effectiveHeight = (hardware.height ?? 1) * unifiedRows;
    const effectiveCount = hardware.count * panelCount;

    const completeConfig = {
      id: driverId,
      version: '1.0',
      led_devices: [
        {
          id: 'device1',
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
          // Unified panel configuration (null if single panel without rotation)
          panel_width: effectiveUnified ? hardware.width : undefined,
          panel_height: effectiveUnified ? hardware.height : undefined,
          unified: effectiveUnified,
          // Strip-specific: reverse LED direction
          reverse: ledConfig.reverse ?? false,
          // RGBW mode for 4-channel strips
          rgbw_mode: ledConfig.rgbwMode ?? 'exact',
        },
      ],
      settings: {
        global_brightness_limit: ledConfig.globalBrightnessLimit,
        dithering: ledConfig.dithering,
        power_supply_volts: ledConfig.powerSupplyVolts,
        max_power_milliamps: ledConfig.maxPowerMilliamps,
        gamma_r: ledConfig.gamma.r ?? 1.0,
        gamma_g: ledConfig.gamma.g ?? 1.0,
        gamma_b: ledConfig.gamma.b ?? 1.0,
        floor_r: ledConfig.floor.r,
        floor_g: ledConfig.floor.g,
        floor_b: ledConfig.floor.b,
      },
    };

    const configTopic = `rgfx/driver/${macAddress}/config`;
    const responseTopic = `rgfx/driver/${macAddress}/config/saved`;
    const payload = JSON.stringify(completeConfig);

    // Log the unified array being sent for debugging
    if (effectiveUnified) {
      log.info(`Uploading unified config: ${JSON.stringify(effectiveUnified)}`);
    }

    // Publish config and wait for driver to confirm it saved to NVS
    const response = await mqtt.publishAndAwaitResponse(
      configTopic,
      payload,
      responseTopic,
      CONFIG_SAVE_TIMEOUT_MS,
    );

    log.info(`Uploaded LED configuration to driver ${driverId}: ${ledConfig.hardwareRef} (${hardware.sku})`);
    log.info(`  globalBrightnessLimit: ${ledConfig.globalBrightnessLimit}`);

    if (response) {
      log.info(`Driver ${driverId} confirmed config saved to NVS`);
      return true;
    }

    log.warn(`Driver ${driverId} did not confirm config save within ${CONFIG_SAVE_TIMEOUT_MS}ms`);
    return false;
  };
}
