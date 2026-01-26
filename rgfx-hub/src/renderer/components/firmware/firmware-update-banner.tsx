import React from 'react';
import { Link } from 'react-router-dom';
import { useDriverStore } from '@/renderer/store/driver-store';
import { useSystemStatusStore } from '@/renderer/store/system-status-store';
import { useUiStore } from '@/renderer/store/ui-store';
import { PageBanner } from '@/renderer/components/common/page-banner';
import { mapChipNameToVariant } from '@/schemas/firmware-manifest';
import type { Driver } from '@/types';

/**
 * Check if a driver needs a firmware update based on its chip type
 */
function driverNeedsUpdate(
  driver: Driver,
  firmwareVersions: Record<string, string> | undefined,
): boolean {
  if (driver.state !== 'connected') {
    return false;
  }

  if (!firmwareVersions || Object.keys(firmwareVersions).length === 0) {
    return false;
  }

  if (!driver.telemetry?.firmwareVersion || !driver.telemetry.chipModel) {
    return false;
  }

  // Map driver's chip model to variant key (ESP32 or ESP32-S3)
  const chipType = mapChipNameToVariant(driver.telemetry.chipModel);

  if (!chipType) {
    return false;
  }

  // Get the target version for this chip type
  const targetVersion = firmwareVersions[chipType];

  if (!targetVersion) {
    return false;
  }

  return driver.telemetry.firmwareVersion !== targetVersion;
}

export function FirmwareUpdateBanner() {
  const drivers = useDriverStore((state) => state.drivers);
  const firmwareVersions = useSystemStatusStore(
    (state) => state.systemStatus.firmwareVersions,
  );
  const isFlashingFirmware = useUiStore((state) => state.isFlashingFirmware);

  // Hide banner while firmware update is in progress
  if (isFlashingFirmware) {
    return null;
  }

  // Count connected drivers that need firmware update
  const driversNeedingUpdate = drivers.filter((driver) =>
    driverNeedsUpdate(driver, firmwareVersions),
  );

  const count = driversNeedingUpdate.length;

  if (count === 0) {
    return null;
  }

  const driverText = count === 1 ? '1 driver' : `${count} drivers`;

  return (
    <PageBanner color="warning">
      New driver firmware is available for {driverText}, see the&nbsp;
      <Link to="/firmware">Firmware Update</Link> page.
    </PageBanner>
  );
}
