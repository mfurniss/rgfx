import React from 'react';
import { Link } from 'react-router-dom';
import { useDriverStore } from '@/renderer/store/driver-store';
import { useSystemStatusStore } from '@/renderer/store/system-status-store';
import { useUiStore } from '@/renderer/store/ui-store';
import { PageBanner } from '@/renderer/components/common/page-banner';
import { driverNeedsUpdate } from '@/renderer/utils/firmware-helpers';

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
    driver.state === 'connected' && driverNeedsUpdate(driver, firmwareVersions),
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
