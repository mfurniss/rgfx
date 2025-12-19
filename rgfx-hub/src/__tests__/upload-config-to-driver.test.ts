/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUploadConfigToDriver } from '../upload-config-to-driver';
import type { DriverPersistence } from '../driver-persistence';
import type { LEDHardwareManager } from '../led-hardware-manager';
import type { MqttBroker } from '../network';

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('createUploadConfigToDriver', () => {
  let mockDriverPersistence: DriverPersistence;
  let mockLedHardwareManager: LEDHardwareManager;
  let mockMqtt: MqttBroker;

  const testMacAddress = 'AA:BB:CC:DD:EE:FF';

  const mockPersistedDriver = {
    id: 'rgfx-driver-0001',
    macAddress: testMacAddress,
    description: 'Test driver',
    ledConfig: {
      hardwareRef: 'led-hardware/test-matrix.json',
      pin: 5,
      offset: 0,
      maxBrightness: 200,
      globalBrightnessLimit: 128,
      dithering: true,
      powerSupplyVolts: 5,
      maxPowerMilliamps: 2000,
      floor: { r: 0, g: 0, b: 0 },
    },
    remoteLogging: 'errors' as const,
    disabled: false,
  };

  const mockHardware = {
    name: 'Test LED Matrix',
    description: 'A test 8x8 matrix panel',
    sku: 'TEST-8X8',
    asin: 'B00TEST123',
    layout: 'matrix-tl-h' as const,
    count: 64,
    chipset: 'WS2812B' as const,
    colorOrder: 'GRB' as const,
    colorCorrection: 'TypicalLEDStrip' as const,
    width: 8,
    height: 8,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockDriverPersistence = {
      getDriverByMac: vi.fn(),
    } as unknown as DriverPersistence;

    mockLedHardwareManager = {
      loadHardware: vi.fn(),
    } as unknown as LEDHardwareManager;

    mockMqtt = {
      publish: vi.fn().mockResolvedValue(undefined),
    } as unknown as MqttBroker;
  });

  describe('successful upload', () => {
    it('should build and publish complete config to driver', async () => {
      vi.mocked(mockDriverPersistence.getDriverByMac).mockReturnValue(mockPersistedDriver);
      vi.mocked(mockLedHardwareManager.loadHardware).mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverPersistence: mockDriverPersistence,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      expect(mockMqtt.publish).toHaveBeenCalledTimes(1);
      expect(mockMqtt.publish).toHaveBeenCalledWith(
        `rgfx/driver/${testMacAddress}/config`,
        expect.any(String),
      );
    });

    it('should include driver ID in published config', async () => {
      vi.mocked(mockDriverPersistence.getDriverByMac).mockReturnValue(mockPersistedDriver);
      vi.mocked(mockLedHardwareManager.loadHardware).mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverPersistence: mockDriverPersistence,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = vi.mocked(mockMqtt.publish).mock.calls[0];
      const payload = JSON.parse(publishCall[1]);

      expect(payload.id).toBe('rgfx-driver-0001');
    });

    it('should build LED device config with hardware and driver settings', async () => {
      vi.mocked(mockDriverPersistence.getDriverByMac).mockReturnValue(mockPersistedDriver);
      vi.mocked(mockLedHardwareManager.loadHardware).mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverPersistence: mockDriverPersistence,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = vi.mocked(mockMqtt.publish).mock.calls[0];
      const payload = JSON.parse(publishCall[1]);

      expect(payload.led_devices).toHaveLength(1);
      const device = payload.led_devices[0];

      // From hardware
      expect(device.name).toBe('Test LED Matrix');
      expect(device.layout).toBe('matrix-tl-h');
      expect(device.count).toBe(64);
      expect(device.chipset).toBe('WS2812B');
      expect(device.color_order).toBe('GRB');
      expect(device.width).toBe(8);
      expect(device.height).toBe(8);

      // From driver config
      expect(device.pin).toBe(5);
      expect(device.offset).toBe(0);
      expect(device.max_brightness).toBe(200);
    });

    it('should include settings from driver config', async () => {
      vi.mocked(mockDriverPersistence.getDriverByMac).mockReturnValue(mockPersistedDriver);
      vi.mocked(mockLedHardwareManager.loadHardware).mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverPersistence: mockDriverPersistence,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = vi.mocked(mockMqtt.publish).mock.calls[0];
      const payload = JSON.parse(publishCall[1]);

      expect(payload.settings.global_brightness_limit).toBe(128);
      expect(payload.settings.dithering).toBe(true);
      expect(payload.settings.power_supply_volts).toBe(5);
      expect(payload.settings.max_power_milliamps).toBe(2000);
      expect(payload.settings.floor_r).toBe(0);
      expect(payload.settings.floor_g).toBe(0);
      expect(payload.settings.floor_b).toBe(0);
    });

    it('should include floor values in settings', async () => {
      const driverWithFloor = {
        ...mockPersistedDriver,
        ledConfig: {
          ...mockPersistedDriver.ledConfig,
          floor: { r: 10, g: 20, b: 30 },
        },
      };

      vi.mocked(mockDriverPersistence.getDriverByMac).mockReturnValue(driverWithFloor);
      vi.mocked(mockLedHardwareManager.loadHardware).mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverPersistence: mockDriverPersistence,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = vi.mocked(mockMqtt.publish).mock.calls[0];
      const payload = JSON.parse(publishCall[1]);

      expect(payload.settings.floor_r).toBe(10);
      expect(payload.settings.floor_g).toBe(20);
      expect(payload.settings.floor_b).toBe(30);
    });

    it('should default offset to 0 when not specified', async () => {
      const driverWithoutOffset = {
        ...mockPersistedDriver,
        ledConfig: {
          ...mockPersistedDriver.ledConfig,
          offset: undefined,
        },
      };

      vi.mocked(mockDriverPersistence.getDriverByMac).mockReturnValue(driverWithoutOffset);
      vi.mocked(mockLedHardwareManager.loadHardware).mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverPersistence: mockDriverPersistence,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = vi.mocked(mockMqtt.publish).mock.calls[0];
      const payload = JSON.parse(publishCall[1]);

      expect(payload.led_devices[0].offset).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should throw when driver not found', async () => {
      vi.mocked(mockDriverPersistence.getDriverByMac).mockReturnValue(undefined);

      const uploadConfig = createUploadConfigToDriver({
        driverPersistence: mockDriverPersistence,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await expect(uploadConfig(testMacAddress)).rejects.toThrow(
        `No driver found with MAC ${testMacAddress}`,
      );
      expect(mockMqtt.publish).not.toHaveBeenCalled();
    });

    it('should throw when driver has no LED config', async () => {
      const driverWithoutLedConfig = {
        ...mockPersistedDriver,
        ledConfig: undefined,
      };

      vi.mocked(mockDriverPersistence.getDriverByMac).mockReturnValue(driverWithoutLedConfig);

      const uploadConfig = createUploadConfigToDriver({
        driverPersistence: mockDriverPersistence,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await expect(uploadConfig(testMacAddress)).rejects.toThrow(
        'Driver rgfx-driver-0001 has no LED configuration',
      );
      expect(mockMqtt.publish).not.toHaveBeenCalled();
    });

    it('should throw when LED hardware fails to load', async () => {
      vi.mocked(mockDriverPersistence.getDriverByMac).mockReturnValue(mockPersistedDriver);
      vi.mocked(mockLedHardwareManager.loadHardware).mockReturnValue(null);

      const uploadConfig = createUploadConfigToDriver({
        driverPersistence: mockDriverPersistence,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await expect(uploadConfig(testMacAddress)).rejects.toThrow(
        'Failed to load LED hardware: led-hardware/test-matrix.json',
      );
      expect(mockMqtt.publish).not.toHaveBeenCalled();
    });
  });

  describe('hardware ref lookup', () => {
    it('should look up hardware using ref from driver config', async () => {
      vi.mocked(mockDriverPersistence.getDriverByMac).mockReturnValue(mockPersistedDriver);
      vi.mocked(mockLedHardwareManager.loadHardware).mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverPersistence: mockDriverPersistence,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      expect(mockLedHardwareManager.loadHardware).toHaveBeenCalledWith(
        'led-hardware/test-matrix.json',
      );
    });
  });

  describe('driver lookup', () => {
    it('should look up driver by MAC address', async () => {
      vi.mocked(mockDriverPersistence.getDriverByMac).mockReturnValue(mockPersistedDriver);
      vi.mocked(mockLedHardwareManager.loadHardware).mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverPersistence: mockDriverPersistence,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      expect(mockDriverPersistence.getDriverByMac).toHaveBeenCalledWith(testMacAddress);
    });
  });

  describe('unified panel configuration', () => {
    it('should use single panel dimensions when unified is undefined', async () => {
      vi.mocked(mockDriverPersistence.getDriverByMac).mockReturnValue(mockPersistedDriver);
      vi.mocked(mockLedHardwareManager.loadHardware).mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverPersistence: mockDriverPersistence,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = vi.mocked(mockMqtt.publish).mock.calls[0];
      const payload = JSON.parse(publishCall[1]);
      const device = payload.led_devices[0];

      expect(device.width).toBe(8);
      expect(device.height).toBe(8);
      expect(device.count).toBe(64);
      expect(device.panel_width).toBeUndefined();
      expect(device.panel_height).toBeUndefined();
      expect(device.unified).toBeUndefined();
    });

    it('should calculate dimensions for 2x2 unified grid', async () => {
      const driverWithUnified = {
        ...mockPersistedDriver,
        ledConfig: {
          ...mockPersistedDriver.ledConfig,
          unified: [
            ['0', '1'],
            ['3', '2'],
          ],
        },
      };

      vi.mocked(mockDriverPersistence.getDriverByMac).mockReturnValue(driverWithUnified);
      vi.mocked(mockLedHardwareManager.loadHardware).mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverPersistence: mockDriverPersistence,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = vi.mocked(mockMqtt.publish).mock.calls[0];
      const payload = JSON.parse(publishCall[1]);
      const device = payload.led_devices[0];

      // 2x2 grid of 8x8 panels = 16x16 display with 256 LEDs
      expect(device.width).toBe(16);
      expect(device.height).toBe(16);
      expect(device.count).toBe(256);
      expect(device.panel_width).toBe(8);
      expect(device.panel_height).toBe(8);
      expect(device.unified).toEqual([
        ['0', '1'],
        ['3', '2'],
      ]);
    });

    it('should calculate dimensions for 1x3 horizontal strip of panels', async () => {
      const driverWithUnified = {
        ...mockPersistedDriver,
        ledConfig: {
          ...mockPersistedDriver.ledConfig,
          unified: [['0', '1', '2']],
        },
      };

      vi.mocked(mockDriverPersistence.getDriverByMac).mockReturnValue(driverWithUnified);
      vi.mocked(mockLedHardwareManager.loadHardware).mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverPersistence: mockDriverPersistence,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = vi.mocked(mockMqtt.publish).mock.calls[0];
      const payload = JSON.parse(publishCall[1]);
      const device = payload.led_devices[0];

      // 1x3 grid of 8x8 panels = 24x8 display with 192 LEDs
      expect(device.width).toBe(24);
      expect(device.height).toBe(8);
      expect(device.count).toBe(192);
    });

    it('should calculate dimensions for 3x1 vertical strip of panels', async () => {
      const driverWithUnified = {
        ...mockPersistedDriver,
        ledConfig: {
          ...mockPersistedDriver.ledConfig,
          unified: [['0'], ['1'], ['2']],
        },
      };

      vi.mocked(mockDriverPersistence.getDriverByMac).mockReturnValue(driverWithUnified);
      vi.mocked(mockLedHardwareManager.loadHardware).mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverPersistence: mockDriverPersistence,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = vi.mocked(mockMqtt.publish).mock.calls[0];
      const payload = JSON.parse(publishCall[1]);
      const device = payload.led_devices[0];

      // 3x1 grid of 8x8 panels = 8x24 display with 192 LEDs
      expect(device.width).toBe(8);
      expect(device.height).toBe(24);
      expect(device.count).toBe(192);
    });

    it('should handle hardware without explicit height (strip)', async () => {
      const stripHardware = {
        ...mockHardware,
        width: 60,
        height: undefined,
      };
      const driverWithUnified = {
        ...mockPersistedDriver,
        ledConfig: {
          ...mockPersistedDriver.ledConfig,
          unified: [['0', '1']],
        },
      };

      vi.mocked(mockDriverPersistence.getDriverByMac).mockReturnValue(driverWithUnified);
      vi.mocked(mockLedHardwareManager.loadHardware).mockReturnValue(stripHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverPersistence: mockDriverPersistence,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = vi.mocked(mockMqtt.publish).mock.calls[0];
      const payload = JSON.parse(publishCall[1]);
      const device = payload.led_devices[0];

      // 1x2 grid of 60-LED strips = 120x1 display
      expect(device.width).toBe(120);
      expect(device.height).toBe(1);
    });
  });
});
