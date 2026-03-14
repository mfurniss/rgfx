import semver from 'semver';
import { mapChipNameToVariant } from '@/schemas/firmware-manifest';
import type { Driver } from '@/types';

interface FirmwareUpdateInfo {
  needsUpdate: boolean;
  driverVersion: string;
  targetVersion: string;
}

/**
 * Get firmware update info for a driver. Returns version details
 * and whether the bundled firmware is strictly newer (semver).
 * Does NOT check connection state - callers should filter for
 * connected drivers.
 */
export function getDriverFirmwareUpdateInfo(
  driver: Driver,
  firmwareVersions: Record<string, string> | undefined,
): FirmwareUpdateInfo | null {
  if (!firmwareVersions || Object.keys(firmwareVersions).length === 0) {
    return null;
  }

  if (
    !driver.telemetry?.firmwareVersion
    || !driver.telemetry.chipModel
  ) {
    return null;
  }

  const chipType = mapChipNameToVariant(driver.telemetry.chipModel);

  if (!chipType) {
    return null;
  }

  const targetVersion = firmwareVersions[chipType];

  if (!targetVersion) {
    return null;
  }

  const driverFw = driver.telemetry.firmwareVersion;

  // Dev builds are always considered newer unless exact match
  if (targetVersion.includes('-dev')) {
    return {
      needsUpdate: targetVersion !== driverFw,
      driverVersion: driverFw,
      targetVersion,
    };
  }

  const target = semver.parse(
    semver.clean(targetVersion) ?? targetVersion,
  );
  const current = semver.parse(
    semver.clean(driverFw) ?? driverFw,
  );

  if (!target || !current) {
    return null;
  }

  return {
    needsUpdate: semver.gt(target, current),
    driverVersion: driverFw,
    targetVersion,
  };
}

/**
 * Convenience wrapper around getDriverFirmwareUpdateInfo.
 */
export function driverNeedsUpdate(
  driver: Driver,
  firmwareVersions: Record<string, string> | undefined,
): boolean {
  const info = getDriverFirmwareUpdateInfo(driver, firmwareVersions);
  return info?.needsUpdate ?? false;
}
