import { mapChipNameToVariant } from '@/schemas/firmware-manifest';
import type { Driver } from '@/types';

/**
 * Check if a driver needs a firmware update based on its chip type.
 * Does NOT check connection state - callers should filter for connected drivers.
 */
export function driverNeedsUpdate(
  driver: Driver,
  firmwareVersions: Record<string, string> | undefined,
): boolean {
  if (!firmwareVersions || Object.keys(firmwareVersions).length === 0) {
    return false;
  }

  if (!driver.telemetry?.firmwareVersion || !driver.telemetry.chipModel) {
    return false;
  }

  const chipType = mapChipNameToVariant(driver.telemetry.chipModel);

  if (!chipType) {
    return false;
  }

  const targetVersion = firmwareVersions[chipType];

  if (!targetVersion) {
    return false;
  }

  return driver.telemetry.firmwareVersion !== targetVersion;
}
