import { describe, it, expect } from 'vitest';
import {
  getRotatedDimensions,
  buildTelemetryRows,
  buildHardwareRows,
  buildLedHardwareRows,
  buildLedConfigRows,
  buildDriverStatusRows,
} from '../driver-card-rows';
import { createMockDriver } from '@/__tests__/factories';
import { createMockTelemetry } from '@/__tests__/factories/telemetry.factory';
import type { DriverLEDConfig, LEDHardware } from '@/types';

describe('driver-card-rows', () => {
  describe('getRotatedDimensions', () => {
    it('returns original dimensions for rotation a (0°)', () => {
      expect(getRotatedDimensions(8, 32, 'a')).toEqual({ width: 8, height: 32 });
    });

    it('swaps dimensions for rotation b (90°)', () => {
      expect(getRotatedDimensions(8, 32, 'b')).toEqual({ width: 32, height: 8 });
    });

    it('returns original dimensions for rotation c (180°)', () => {
      expect(getRotatedDimensions(8, 32, 'c')).toEqual({ width: 8, height: 32 });
    });

    it('swaps dimensions for rotation d (270°)', () => {
      expect(getRotatedDimensions(8, 32, 'd')).toEqual({ width: 32, height: 8 });
    });

    it('handles square panels', () => {
      expect(getRotatedDimensions(16, 16, 'a')).toEqual({ width: 16, height: 16 });
      expect(getRotatedDimensions(16, 16, 'b')).toEqual({ width: 16, height: 16 });
    });

    it('returns original dimensions for unknown rotation codes', () => {
      expect(getRotatedDimensions(8, 32, 'x')).toEqual({ width: 8, height: 32 });
      expect(getRotatedDimensions(8, 32, '')).toEqual({ width: 8, height: 32 });
    });
  });

  describe('buildTelemetryRows', () => {
    it('returns minimal rows when telemetry is undefined', () => {
      const driver = createMockDriver({ telemetry: undefined });
      const rows = buildTelemetryRows({
        driver,
        telemetry: undefined,
        currentUptime: 0,
        now: Date.now(),
      });

      // Should still have stats rows
      expect(rows.some(row => row[0] === 'Telemetry Events')).toBe(true);
      expect(rows.some(row => row[0] === 'MQTT Messages Received')).toBe(true);
    });

    it('includes frame rate when telemetry present', () => {
      const driver = createMockDriver();
      const telemetry = createMockTelemetry({ currentFps: 120.5, minFps: 118.0, maxFps: 122.0 });
      const rows = buildTelemetryRows({
        driver,
        telemetry,
        currentUptime: 60000,
        now: Date.now(),
      });

      const fpsRow = rows.find(row => row[0] === 'Frame Rate');
      expect(fpsRow).toBeDefined();
      expect(fpsRow![1]).toContain('120.5');
      expect(fpsRow![1]).toContain('118.0');
      expect(fpsRow![1]).toContain('122.0');
    });

    it('includes uptime when telemetry present', () => {
      const driver = createMockDriver();
      const telemetry = createMockTelemetry();
      const rows = buildTelemetryRows({
        driver,
        telemetry,
        currentUptime: 3600000, // 1 hour
        now: Date.now(),
      });

      const uptimeRow = rows.find(row => row[0] === 'Driver Uptime');
      expect(uptimeRow).toBeDefined();
      expect(uptimeRow![1]).toContain('1h');
    });

    it('includes memory info when available', () => {
      const driver = createMockDriver({ freeHeap: 200000, minFreeHeap: 150000 });
      const telemetry = createMockTelemetry({ heapSize: 327680 });
      const rows = buildTelemetryRows({
        driver,
        telemetry,
        currentUptime: 60000,
        now: Date.now(),
      });

      const memoryRow = rows.find(row => row[0] === 'Memory');
      expect(memoryRow).toBeDefined();
    });

    it('includes PSRAM info when available', () => {
      const driver = createMockDriver();
      const telemetry = createMockTelemetry({ psramSize: 4000000, freePsram: 3500000 });
      const rows = buildTelemetryRows({
        driver,
        telemetry,
        currentUptime: 60000,
        now: Date.now(),
      });

      const psramRow = rows.find(row => row[0] === 'Free PSRAM');
      expect(psramRow).toBeDefined();
    });

    it('excludes PSRAM when size is 0', () => {
      const driver = createMockDriver();
      const telemetry = createMockTelemetry({ psramSize: 0, freePsram: 0 });
      const rows = buildTelemetryRows({
        driver,
        telemetry,
        currentUptime: 60000,
        now: Date.now(),
      });

      const psramRow = rows.find(row => row[0] === 'Free PSRAM');
      expect(psramRow).toBeUndefined();
    });

    it('includes WiFi signal when rssi available', () => {
      const driver = createMockDriver({ rssi: -65 });
      const rows = buildTelemetryRows({
        driver,
        telemetry: undefined,
        currentUptime: 0,
        now: Date.now(),
      });

      const signalRow = rows.find(row => row[0] === 'WiFi Signal');
      expect(signalRow).toBeDefined();
      expect(signalRow![1]).toContain('-65');
    });

    it('includes crash count when greater than 0', () => {
      const driver = createMockDriver();
      const telemetry = createMockTelemetry({ crashCount: 3 });
      const rows = buildTelemetryRows({
        driver,
        telemetry,
        currentUptime: 60000,
        now: Date.now(),
      });

      const crashRow = rows.find(row => row[0] === 'Crash Count');
      expect(crashRow).toBeDefined();
      expect(crashRow![1]).toBe('3');
    });

    it('excludes crash count when 0', () => {
      const driver = createMockDriver();
      const telemetry = createMockTelemetry({ crashCount: 0 });
      const rows = buildTelemetryRows({
        driver,
        telemetry,
        currentUptime: 60000,
        now: Date.now(),
      });

      const crashRow = rows.find(row => row[0] === 'Crash Count');
      expect(crashRow).toBeUndefined();
    });

    it('includes last reset reason when present', () => {
      const driver = createMockDriver();
      const telemetry = createMockTelemetry({ lastResetReason: 'Power on reset' });
      const rows = buildTelemetryRows({
        driver,
        telemetry,
        currentUptime: 60000,
        now: Date.now(),
      });

      const resetRow = rows.find(row => row[0] === 'Last Reset Reason');
      expect(resetRow).toBeDefined();
      expect(resetRow![1]).toBe('Power on reset');
    });
  });

  describe('buildHardwareRows', () => {
    it('returns empty array when telemetry is undefined', () => {
      const driver = createMockDriver();
      const rows = buildHardwareRows({ driver, telemetry: undefined });
      expect(rows).toEqual([]);
    });

    it('includes IP and MAC addresses', () => {
      const driver = createMockDriver({ ip: '192.168.1.100', mac: 'AA:BB:CC:DD:EE:FF' });
      const telemetry = createMockTelemetry();
      const rows = buildHardwareRows({ driver, telemetry });

      expect(rows.find(row => row[0] === 'IP Address')?.[1]).toBe('192.168.1.100');
      expect(rows.find(row => row[0] === 'MAC Address')?.[1]).toBe('AA:BB:CC:DD:EE:FF');
    });

    it('includes chip information', () => {
      const driver = createMockDriver();
      const telemetry = createMockTelemetry({
        chipModel: 'ESP32-S3',
        chipRevision: 2,
        chipCores: 2,
      });
      const rows = buildHardwareRows({ driver, telemetry });

      expect(rows.find(row => row[0] === 'Chip Model')?.[1]).toBe('ESP32-S3');
      expect(rows.find(row => row[0] === 'Chip Revision')?.[1]).toBe('2');
      expect(rows.find(row => row[0] === 'CPU Cores')?.[1]).toBe('2');
    });

    it('includes firmware version when present', () => {
      const driver = createMockDriver();
      const telemetry = createMockTelemetry({ firmwareVersion: '1.2.3' });
      const rows = buildHardwareRows({ driver, telemetry });

      const fwRow = rows.find(row => row[0] === 'Firmware Version');
      expect(fwRow).toBeDefined();
      expect(fwRow![1]).toBe('1.2.3');
    });

    it('excludes firmware version when not present', () => {
      const driver = createMockDriver();
      const telemetry = createMockTelemetry({ firmwareVersion: undefined });
      const rows = buildHardwareRows({ driver, telemetry });

      const fwRow = rows.find(row => row[0] === 'Firmware Version');
      expect(fwRow).toBeUndefined();
    });
  });

  describe('buildLedHardwareRows', () => {
    const mockHardware: LEDHardware = {
      description: 'Test LED Panel',
      sku: 'LED-8x32',
      asin: 'B0123456789',
      layout: 'matrix-tl-h',
      count: 256,
      chipset: 'WS2812B',
      colorOrder: 'GRB',
      width: 8,
      height: 32,
    };

    it('returns empty array when hardware is undefined', () => {
      const rows = buildLedHardwareRows({ hardware: undefined, hardwareFilename: 'test.json' });
      expect(rows).toEqual([]);
    });

    it('includes hardware filename', () => {
      const rows = buildLedHardwareRows({ hardware: mockHardware, hardwareFilename: 'panel-8x32.json' });
      expect(rows.find(row => row[0] === 'Filename')?.[1]).toBe('panel-8x32.json');
    });

    it('includes description or shows Not set', () => {
      const rows = buildLedHardwareRows({ hardware: mockHardware, hardwareFilename: 'test.json' });
      expect(rows.find(row => row[0] === 'Description')?.[1]).toBe('Test LED Panel');

      const noDescRows = buildLedHardwareRows({
        hardware: { ...mockHardware, description: undefined },
        hardwareFilename: 'test.json',
      });
      expect(noDescRows.find(row => row[0] === 'Description')?.[1]).toBe('Not set');
    });

    it('includes ASIN when present', () => {
      const rows = buildLedHardwareRows({ hardware: mockHardware, hardwareFilename: 'test.json' });
      const asinRow = rows.find(row => row[0] === 'ASIN');
      expect(asinRow).toBeDefined();
      expect(asinRow![1]).toBe('B0123456789');
    });

    it('excludes ASIN when not present', () => {
      const rows = buildLedHardwareRows({
        hardware: { ...mockHardware, asin: undefined },
        hardwareFilename: 'test.json',
      });
      const asinRow = rows.find(row => row[0] === 'ASIN');
      expect(asinRow).toBeUndefined();
    });

    it('includes panel size for non-strip layouts', () => {
      const rows = buildLedHardwareRows({ hardware: mockHardware, hardwareFilename: 'test.json' });
      const sizeRow = rows.find(row => row[0] === 'Panel Size');
      expect(sizeRow).toBeDefined();
      expect(sizeRow![1]).toBe('8 × 32');
    });

    it('excludes panel size for strip layouts', () => {
      const stripHardware: LEDHardware = { ...mockHardware, layout: 'strip' };
      const rows = buildLedHardwareRows({ hardware: stripHardware, hardwareFilename: 'test.json' });
      const sizeRow = rows.find(row => row[0] === 'Panel Size');
      expect(sizeRow).toBeUndefined();
    });
  });

  describe('buildLedConfigRows', () => {
    const mockConfig: DriverLEDConfig = {
      hardwareRef: 'hardware/panel-8x32.json',
      pin: 16,
      offset: 0,
      maxBrightness: 255,
      globalBrightnessLimit: 128,
      dithering: true,
      reverse: false,
      gamma: { r: 2.8, g: 2.8, b: 2.8 },
      floor: { r: 0, g: 0, b: 0 },
    };

    const mockHardware: LEDHardware = {
      layout: 'matrix-tl-h',
      count: 256,
      sku: null,
      width: 8,
      height: 32,
    };

    it('returns empty array when ledConfig is undefined', () => {
      const rows = buildLedConfigRows({
        ledConfig: undefined,
        hardware: mockHardware,
        actualWidth: 8,
        actualHeight: 32,
      });
      expect(rows).toEqual([]);
    });

    it('returns empty array when ledConfig is null', () => {
      const rows = buildLedConfigRows({
        ledConfig: null,
        hardware: mockHardware,
        actualWidth: 8,
        actualHeight: 32,
      });
      expect(rows).toEqual([]);
    });

    it('includes data pin', () => {
      const rows = buildLedConfigRows({
        ledConfig: mockConfig,
        hardware: mockHardware,
        actualWidth: 8,
        actualHeight: 32,
      });
      expect(rows.find(row => row[0] === 'Data Pin')?.[1]).toBe('16');
    });

    it('includes actual dimensions for matrix layouts', () => {
      const rows = buildLedConfigRows({
        ledConfig: mockConfig,
        hardware: mockHardware,
        actualWidth: 16,
        actualHeight: 64,
      });
      expect(rows.find(row => row[0] === 'Actual Dimensions')?.[1]).toBe('16 × 64');
      expect(rows.find(row => row[0] === 'Total LED Count')?.[1]).toBe('1,024');
    });

    it('excludes actual dimensions for strip layouts', () => {
      const stripHardware: LEDHardware = { ...mockHardware, layout: 'strip' };
      const rows = buildLedConfigRows({
        ledConfig: mockConfig,
        hardware: stripHardware,
        actualWidth: 100,
        actualHeight: 1,
      });
      expect(rows.find(row => row[0] === 'Actual Dimensions')).toBeUndefined();
    });

    it('includes brightness settings', () => {
      const rows = buildLedConfigRows({
        ledConfig: mockConfig,
        hardware: mockHardware,
        actualWidth: 8,
        actualHeight: 32,
      });
      expect(rows.find(row => row[0] === 'Max Brightness')?.[1]).toBe('255');
      expect(rows.find(row => row[0] === 'Brightness Limit')?.[1]).toBe('128');
    });

    it('shows Not set for undefined brightness', () => {
      const configNoBrightness = {
        ...mockConfig, maxBrightness: null, globalBrightnessLimit: null,
      };
      const rows = buildLedConfigRows({
        ledConfig: configNoBrightness,
        hardware: mockHardware,
        actualWidth: 8,
        actualHeight: 32,
      });
      expect(rows.find(row => row[0] === 'Max Brightness')?.[1]).toBe('Not set');
      expect(rows.find(row => row[0] === 'Brightness Limit')?.[1]).toBe('Not set');
    });

    it('includes dithering status', () => {
      const rows = buildLedConfigRows({
        ledConfig: mockConfig,
        hardware: mockHardware,
        actualWidth: 8,
        actualHeight: 32,
      });
      expect(rows.find(row => row[0] === 'Dithering')?.[1]).toBe('Yes');

      const noDitherConfig = { ...mockConfig, dithering: false };
      const rowsNoDither = buildLedConfigRows({
        ledConfig: noDitherConfig,
        hardware: mockHardware,
        actualWidth: 8,
        actualHeight: 32,
      });
      expect(rowsNoDither.find(row => row[0] === 'Dithering')?.[1]).toBe('No');
    });

    it('includes gamma correction values', () => {
      const rows = buildLedConfigRows({
        ledConfig: mockConfig,
        hardware: mockHardware,
        actualWidth: 8,
        actualHeight: 32,
      });
      expect(rows.find(row => row[0] === 'Gamma Correction')?.[1]).toBe('R: 2.8, G: 2.8, B: 2.8');
    });

    it('includes floor cutoff when values > 0', () => {
      const floorConfig = { ...mockConfig, floor: { r: 10, g: 5, b: 0 } };
      const rows = buildLedConfigRows({
        ledConfig: floorConfig,
        hardware: mockHardware,
        actualWidth: 8,
        actualHeight: 32,
      });
      expect(rows.find(row => row[0] === 'Floor Cutoff')?.[1]).toBe('R: 10, G: 5, B: 0');
    });

    it('excludes floor cutoff when all values are 0', () => {
      const rows = buildLedConfigRows({
        ledConfig: mockConfig,
        hardware: mockHardware,
        actualWidth: 8,
        actualHeight: 32,
      });
      expect(rows.find(row => row[0] === 'Floor Cutoff')).toBeUndefined();
    });

    it('includes multi-panel layout info', () => {
      const unifiedConfig = {
        ...mockConfig,
        unified: [['0a', '1b'], ['3d', '2c']],
      };
      const rows = buildLedConfigRows({
        ledConfig: unifiedConfig,
        hardware: mockHardware,
        actualWidth: 16,
        actualHeight: 64,
      });
      const layoutRow = rows.find(row => row[0] === 'Multi-Panel Layout');
      expect(layoutRow).toBeDefined();
      expect(layoutRow![1]).toContain('2 rows');
      expect(layoutRow![1]).toContain('2 cols');
      expect(layoutRow![1]).toContain('4 panels');
    });

    it('includes power settings when present', () => {
      const powerConfig = { ...mockConfig, powerSupplyVolts: 5, maxPowerMilliamps: 10000 };
      const rows = buildLedConfigRows({
        ledConfig: powerConfig,
        hardware: mockHardware,
        actualWidth: 8,
        actualHeight: 32,
      });
      expect(rows.find(row => row[0] === 'Power Supply')?.[1]).toBe('5V');
      expect(rows.find(row => row[0] === 'Max Power')?.[1]).toBe('10,000 mA');
    });
  });

  describe('buildDriverStatusRows', () => {
    it('includes enabled status', () => {
      const driver = createMockDriver({ disabled: false });
      const rows = buildDriverStatusRows(driver);
      expect(rows.find(row => row[0] === 'Status')?.[1]).toBe('Enabled');
    });

    it('includes disabled status', () => {
      const driver = createMockDriver({ disabled: true });
      const rows = buildDriverStatusRows(driver);
      expect(rows.find(row => row[0] === 'Status')?.[1]).toBe('Disabled');
    });

    it('includes description when present', () => {
      const driver = createMockDriver({ description: 'Living Room Panel' });
      const rows = buildDriverStatusRows(driver);
      expect(rows.find(row => row[0] === 'Description')?.[1]).toBe('Living Room Panel');
    });

    it('excludes description when not present', () => {
      const driver = createMockDriver({ description: undefined });
      const rows = buildDriverStatusRows(driver);
      expect(rows.find(row => row[0] === 'Description')).toBeUndefined();
    });

    it('includes update rate when present', () => {
      const driver = createMockDriver({ updateRate: 60 });
      const rows = buildDriverStatusRows(driver);
      expect(rows.find(row => row[0] === 'Update Rate')?.[1]).toBe('60 Hz');
    });

    it('includes failed heartbeats when > 0', () => {
      const driver = createMockDriver({ failedHeartbeats: 5 });
      const rows = buildDriverStatusRows(driver);
      expect(rows.find(row => row[0] === 'Failed Heartbeats')?.[1]).toBe('5');
    });

    it('excludes failed heartbeats when 0', () => {
      const driver = createMockDriver({ failedHeartbeats: 0 });
      const rows = buildDriverStatusRows(driver);
      expect(rows.find(row => row[0] === 'Failed Heartbeats')).toBeUndefined();
    });

    it('includes remote logging setting', () => {
      const driverAll = createMockDriver({ remoteLogging: 'all' });
      expect(buildDriverStatusRows(driverAll).find(row => row[0] === 'Remote Logging')?.[1]).toBe('All Messages');

      const driverErrors = createMockDriver({ remoteLogging: 'errors' });
      expect(buildDriverStatusRows(driverErrors).find(row => row[0] === 'Remote Logging')?.[1]).toBe('Errors Only');

      const driverOff = createMockDriver({ remoteLogging: 'off' });
      expect(buildDriverStatusRows(driverOff).find(row => row[0] === 'Remote Logging')?.[1]).toBe('Off');
    });
  });
});
