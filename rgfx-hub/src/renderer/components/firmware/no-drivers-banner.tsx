import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@mui/material';
import { useDriverStore } from '@/renderer/store/driver-store';
import { PageBanner } from '@/renderer/components/common/page-banner';

export function NoDriversBanner() {
  const drivers = useDriverStore((state) => state.drivers);

  if (drivers.length > 0) {
    return null;
  }

  return (
    <PageBanner color="info">
      Visit the <Link component={RouterLink} to="/firmware">Firmware</Link> page to flash your first ESP32 driver.
    </PageBanner>
  );
}
