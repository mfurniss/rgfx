import { describe, it, expect } from 'vitest';
import { driverNeedsUpdate } from '../firmware-helpers';
import { createDriver } from '@/types';

function makeDriver(overrides: {
  chipModel?: string;
  firmwareVersion?: string;
} = {}) {
  return createDriver({
    id: 'test-driver',
    telemetry: {
      chipModel: overrides.chipModel ?? 'ESP32-D0WD-V3',
      chipRevision: 3,
      chipCores: 2,
      cpuFreqMHz: 240,
      flashSize: 4194304,
      flashSpeed: 40000000,
      heapSize: 327680,
      maxAllocHeap: 327680,
      psramSize: 0,
      freePsram: 0,
      firmwareVersion: overrides.firmwareVersion ?? '1.0.0',
      sdkVersion: '5.1.0',
      sketchSize: 1000000,
      freeSketchSpace: 2000000,
      currentFps: 60,
      minFps: 58,
      maxFps: 62,
    },
  });
}

const firmwareVersions: Record<string, string> = {
  'ESP32': '2.0.0',
  'ESP32-S3': '2.0.0',
};

describe('driverNeedsUpdate', () => {
  it('should return true when driver firmware differs from target', () => {
    const driver = makeDriver({ firmwareVersion: '1.0.0' });
    expect(driverNeedsUpdate(driver, firmwareVersions)).toBe(true);
  });

  it('should return false when driver firmware matches target', () => {
    const driver = makeDriver({ firmwareVersion: '2.0.0' });
    expect(driverNeedsUpdate(driver, firmwareVersions)).toBe(false);
  });

  it('should return false when firmwareVersions is undefined', () => {
    const driver = makeDriver();
    expect(driverNeedsUpdate(driver, undefined)).toBe(false);
  });

  it('should return false when firmwareVersions is empty', () => {
    const driver = makeDriver();
    expect(driverNeedsUpdate(driver, {})).toBe(false);
  });

  it('should return false when driver has no telemetry', () => {
    const driver = createDriver({ id: 'no-telemetry' });
    expect(driverNeedsUpdate(driver, firmwareVersions)).toBe(false);
  });

  it('should return false when driver has no firmware version', () => {
    const driver = makeDriver({ firmwareVersion: undefined });
    // firmwareVersion is optional, remove it
    delete driver.telemetry!.firmwareVersion;
    expect(driverNeedsUpdate(driver, firmwareVersions)).toBe(false);
  });

  it('should return false for unsupported chip types', () => {
    const driver = makeDriver({ chipModel: 'ESP32-C3' });
    expect(driverNeedsUpdate(driver, firmwareVersions)).toBe(false);
  });

  it('should return false when no target version for chip type', () => {
    const driver = makeDriver({ chipModel: 'ESP32-S3' });
    expect(driverNeedsUpdate(driver, { 'ESP32': '2.0.0' })).toBe(false);
  });

  it('should map ESP32-S3 variants correctly', () => {
    const driver = makeDriver({
      chipModel: 'ESP32-S3-WROOM-1',
      firmwareVersion: '1.0.0',
    });
    expect(driverNeedsUpdate(driver, firmwareVersions)).toBe(true);
  });

  it('should map original ESP32 variants correctly', () => {
    const driver = makeDriver({
      chipModel: 'ESP32-PICO-V3-02',
      firmwareVersion: '1.0.0',
    });
    expect(driverNeedsUpdate(driver, firmwareVersions)).toBe(true);
  });
});
