/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mock, type MockProxy } from 'vitest-mock-extended';
import { createUploadConfigToDriver } from '../upload-config-to-driver';
import type { DriverConfig } from '../driver-config';
import type { LEDHardwareManager } from '../led-hardware-manager';
import type { MqttBroker } from '../network';

vi.mock('electron-log/main', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('createUploadConfigToDriver', () => {
  let mockDriverConfig: MockProxy<DriverConfig>;
  let mockLedHardwareManager: MockProxy<LEDHardwareManager>;
  let mockMqtt: MockProxy<MqttBroker>;

  const testMacAddress = 'AA:BB:CC:DD:EE:FF';

  const mockConfiguredDriver = {
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
      gamma: { r: 2.8, g: 2.8, b: 2.8 },
      floor: { r: 0, g: 0, b: 0 },
    },
    remoteLogging: 'errors' as const,
    disabled: false,
  };

  const mockHardware = {
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

    mockDriverConfig = mock<DriverConfig>();
    mockLedHardwareManager = mock<LEDHardwareManager>();
    mockMqtt = mock<MqttBroker>();
    // Mock publishAndAwaitResponse to simulate driver confirming config save
    mockMqtt.publishAndAwaitResponse.mockResolvedValue('ok');
  });

  describe('successful upload', () => {
    it('should build and publish complete config to driver', async () => {
      mockDriverConfig.getDriverByMac.mockReturnValue(mockConfiguredDriver);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      expect(mockMqtt.publishAndAwaitResponse).toHaveBeenCalledTimes(1);
      expect(mockMqtt.publishAndAwaitResponse).toHaveBeenCalledWith(
        `rgfx/driver/${testMacAddress}/config`,
        expect.any(String),
        `rgfx/driver/${testMacAddress}/config/saved`,
        expect.any(Number),
      );
    });

    it('should include driver ID in published config', async () => {
      mockDriverConfig.getDriverByMac.mockReturnValue(mockConfiguredDriver);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
      const payload = JSON.parse(publishCall[1]);

      expect(payload.id).toBe('rgfx-driver-0001');
    });

    it('should build LED device config with hardware and driver settings', async () => {
      mockDriverConfig.getDriverByMac.mockReturnValue(mockConfiguredDriver);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
      const payload = JSON.parse(publishCall[1]);

      expect(payload.led_devices).toHaveLength(1);
      const device = payload.led_devices[0];

      // From hardware
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
      mockDriverConfig.getDriverByMac.mockReturnValue(mockConfiguredDriver);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
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
        ...mockConfiguredDriver,
        ledConfig: {
          ...mockConfiguredDriver.ledConfig,
          floor: { r: 10, g: 20, b: 30 },
        },
      };

      mockDriverConfig.getDriverByMac.mockReturnValue(driverWithFloor);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
      const payload = JSON.parse(publishCall[1]);

      expect(payload.settings.floor_r).toBe(10);
      expect(payload.settings.floor_g).toBe(20);
      expect(payload.settings.floor_b).toBe(30);
    });

    it('should default offset to 0 when not specified', async () => {
      const driverWithoutOffset = {
        ...mockConfiguredDriver,
        ledConfig: {
          ...mockConfiguredDriver.ledConfig,
          offset: undefined,
        },
      };

      mockDriverConfig.getDriverByMac.mockReturnValue(driverWithoutOffset);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
      const payload = JSON.parse(publishCall[1]);

      expect(payload.led_devices[0].offset).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should throw when driver not found', async () => {
      mockDriverConfig.getDriverByMac.mockReturnValue(undefined);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await expect(uploadConfig(testMacAddress)).rejects.toThrow(
        `No driver found with MAC ${testMacAddress}`,
      );
      expect(mockMqtt.publishAndAwaitResponse).not.toHaveBeenCalled();
    });

    it('should throw when driver has no LED config', async () => {
      const driverWithoutLedConfig = {
        ...mockConfiguredDriver,
        ledConfig: undefined,
      };

      mockDriverConfig.getDriverByMac.mockReturnValue(driverWithoutLedConfig);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await expect(uploadConfig(testMacAddress)).rejects.toThrow(
        'Driver rgfx-driver-0001 has no LED configuration',
      );
      expect(mockMqtt.publishAndAwaitResponse).not.toHaveBeenCalled();
    });

    it('should throw when LED hardware fails to load', async () => {
      mockDriverConfig.getDriverByMac.mockReturnValue(mockConfiguredDriver);
      mockLedHardwareManager.loadHardware.mockReturnValue(null);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await expect(uploadConfig(testMacAddress)).rejects.toThrow(
        'Failed to load LED hardware: led-hardware/test-matrix.json',
      );
      expect(mockMqtt.publishAndAwaitResponse).not.toHaveBeenCalled();
    });
  });

  describe('hardware ref lookup', () => {
    it('should look up hardware using ref from driver config', async () => {
      mockDriverConfig.getDriverByMac.mockReturnValue(mockConfiguredDriver);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
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
      mockDriverConfig.getDriverByMac.mockReturnValue(mockConfiguredDriver);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      expect(mockDriverConfig.getDriverByMac).toHaveBeenCalledWith(testMacAddress);
    });
  });

  describe('unified panel configuration', () => {
    it('should use single panel dimensions when unified is undefined', async () => {
      mockDriverConfig.getDriverByMac.mockReturnValue(mockConfiguredDriver);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
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
        ...mockConfiguredDriver,
        ledConfig: {
          ...mockConfiguredDriver.ledConfig,
          unified: [
            ['0', '1'],
            ['3', '2'],
          ],
        },
      };

      mockDriverConfig.getDriverByMac.mockReturnValue(driverWithUnified);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
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
        ...mockConfiguredDriver,
        ledConfig: {
          ...mockConfiguredDriver.ledConfig,
          unified: [['0', '1', '2']],
        },
      };

      mockDriverConfig.getDriverByMac.mockReturnValue(driverWithUnified);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
      const payload = JSON.parse(publishCall[1]);
      const device = payload.led_devices[0];

      // 1x3 grid of 8x8 panels = 24x8 display with 192 LEDs
      expect(device.width).toBe(24);
      expect(device.height).toBe(8);
      expect(device.count).toBe(192);
    });

    it('should calculate dimensions for 3x1 vertical strip of panels', async () => {
      const driverWithUnified = {
        ...mockConfiguredDriver,
        ledConfig: {
          ...mockConfiguredDriver.ledConfig,
          unified: [['0'], ['1'], ['2']],
        },
      };

      mockDriverConfig.getDriverByMac.mockReturnValue(driverWithUnified);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
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
        ...mockConfiguredDriver,
        ledConfig: {
          ...mockConfiguredDriver.ledConfig,
          unified: [['0', '1']],
        },
      };

      mockDriverConfig.getDriverByMac.mockReturnValue(driverWithUnified);
      mockLedHardwareManager.loadHardware.mockReturnValue(stripHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
      const payload = JSON.parse(publishCall[1]);
      const device = payload.led_devices[0];

      // 1x2 grid of 60-LED strips = 120x1 display
      expect(device.width).toBe(120);
      expect(device.height).toBe(1);
    });
  });

  describe('strip reverse configuration', () => {
    it('should include reverse field in LED device config', async () => {
      const driverWithReverse = {
        ...mockConfiguredDriver,
        ledConfig: {
          ...mockConfiguredDriver.ledConfig,
          reverse: true,
        },
      };

      mockDriverConfig.getDriverByMac.mockReturnValue(driverWithReverse);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
      const payload = JSON.parse(publishCall[1]);
      const device = payload.led_devices[0];

      expect(device.reverse).toBe(true);
    });

    it('should default reverse to false when not specified', async () => {
      mockDriverConfig.getDriverByMac.mockReturnValue(mockConfiguredDriver);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
      const payload = JSON.parse(publishCall[1]);
      const device = payload.led_devices[0];

      expect(device.reverse).toBe(false);
    });

    it('should include reverse: false when explicitly set to false', async () => {
      const driverWithReverseFalse = {
        ...mockConfiguredDriver,
        ledConfig: {
          ...mockConfiguredDriver.ledConfig,
          reverse: false,
        },
      };

      mockDriverConfig.getDriverByMac.mockReturnValue(driverWithReverseFalse);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
      const payload = JSON.parse(publishCall[1]);
      const device = payload.led_devices[0];

      expect(device.reverse).toBe(false);
    });
  });

  describe('single-panel rotation', () => {
    it('should convert rotation 90° to 1x1 unified array [["0b"]]', async () => {
      const driverWithRotation = {
        ...mockConfiguredDriver,
        ledConfig: {
          ...mockConfiguredDriver.ledConfig,
          rotation: '90' as const,
        },
      };

      mockDriverConfig.getDriverByMac.mockReturnValue(driverWithRotation);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
      const payload = JSON.parse(publishCall[1]);
      const device = payload.led_devices[0];

      expect(device.unified).toEqual([['0b']]);
      expect(device.panel_width).toBe(8);
      expect(device.panel_height).toBe(8);
    });

    it('should convert rotation 180° to [["0c"]]', async () => {
      const driverWithRotation = {
        ...mockConfiguredDriver,
        ledConfig: {
          ...mockConfiguredDriver.ledConfig,
          rotation: '180' as const,
        },
      };

      mockDriverConfig.getDriverByMac.mockReturnValue(driverWithRotation);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
      const payload = JSON.parse(publishCall[1]);

      expect(payload.led_devices[0].unified).toEqual([['0c']]);
    });

    it('should convert rotation 270° to [["0d"]]', async () => {
      const driverWithRotation = {
        ...mockConfiguredDriver,
        ledConfig: {
          ...mockConfiguredDriver.ledConfig,
          rotation: '270' as const,
        },
      };

      mockDriverConfig.getDriverByMac.mockReturnValue(driverWithRotation);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
      const payload = JSON.parse(publishCall[1]);

      expect(payload.led_devices[0].unified).toEqual([['0d']]);
    });

    it('should not create unified array when rotation is 0°', async () => {
      const driverWithRotation = {
        ...mockConfiguredDriver,
        ledConfig: {
          ...mockConfiguredDriver.ledConfig,
          rotation: '0' as const,
        },
      };

      mockDriverConfig.getDriverByMac.mockReturnValue(driverWithRotation);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
      const payload = JSON.parse(publishCall[1]);

      expect(payload.led_devices[0].unified).toBeUndefined();
      expect(payload.led_devices[0].panel_width).toBeUndefined();
    });

    it('should not create unified array when rotation is null', async () => {
      const driverWithNullRotation = {
        ...mockConfiguredDriver,
        ledConfig: {
          ...mockConfiguredDriver.ledConfig,
          rotation: null,
        },
      };

      mockDriverConfig.getDriverByMac.mockReturnValue(driverWithNullRotation);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
      const payload = JSON.parse(publishCall[1]);

      expect(payload.led_devices[0].unified).toBeUndefined();
    });

    it('should use explicit unified array over rotation field', async () => {
      const driverWithBoth = {
        ...mockConfiguredDriver,
        ledConfig: {
          ...mockConfiguredDriver.ledConfig,
          rotation: '90' as const,
          unified: [['0', '1']],
        },
      };

      mockDriverConfig.getDriverByMac.mockReturnValue(driverWithBoth);
      mockLedHardwareManager.loadHardware.mockReturnValue(mockHardware);

      const uploadConfig = createUploadConfigToDriver({
        driverConfig: mockDriverConfig,
        ledHardwareManager: mockLedHardwareManager,
        mqtt: mockMqtt,
      });

      await uploadConfig(testMacAddress);

      const publishCall = mockMqtt.publishAndAwaitResponse.mock.calls[0];
      const payload = JSON.parse(publishCall[1]);

      // Explicit unified array takes precedence over rotation
      expect(payload.led_devices[0].unified).toEqual([['0', '1']]);
    });
  });
});
