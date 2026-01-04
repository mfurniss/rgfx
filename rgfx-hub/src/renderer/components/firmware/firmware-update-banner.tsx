import React from 'react';
import { Link } from 'react-router-dom';
import { useDriverStore } from '@/renderer/store/driver-store';
import { useSystemStatusStore } from '@/renderer/store/system-status-store';
import { useUiStore } from '@/renderer/store/ui-store';
import { PageBanner } from '@/renderer/components/common/page-banner';

export function FirmwareUpdateBanner() {
  const drivers = useDriverStore((state) => state.drivers);
  const currentFirmwareVersion = useSystemStatusStore(
    (state) => state.systemStatus.currentFirmwareVersion,
  );
  const isFlashingFirmware = useUiStore((state) => state.isFlashingFirmware);

  // Hide banner while firmware update is in progress
  if (isFlashingFirmware) {
    return null;
  }

  // Count connected drivers that need firmware update
  const driversNeedingUpdate = drivers.filter((driver) => {
    if (driver.state !== 'connected') {
      return false;
    }

    if (!currentFirmwareVersion) {
      return false;
    }

    if (!driver.telemetry?.firmwareVersion) {
      return false;
    }

    return driver.telemetry.firmwareVersion !== currentFirmwareVersion;
  });

  const count = driversNeedingUpdate.length;

  if (count === 0) {
    return null;
  }

  const driverText = count === 1 ? '1 driver' : `${count} drivers`;

  return (
    <PageBanner color="warning">
      New driver firmware is available for {driverText}, see the
      <Link to="/firmware">Firmware Update</Link> page.
    </PageBanner>
  );
}
