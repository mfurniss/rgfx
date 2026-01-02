import React from 'react';
import { Box, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useDriverStore } from '@/renderer/store/driver-store';
import { useSystemStatusStore } from '@/renderer/store/system-status-store';
import { useUiStore } from '@/renderer/store/ui-store';

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
    <Box
      sx={{
        backgroundColor: 'warning.main',
        color: 'warning.contrastText',
        px: 2,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography variant="body1" sx={{ fontWeight: 500 }}>
        New driver firmware is available for {driverText}, see{' '}
        <Box
          component={RouterLink}
          to="/firmware"
          sx={{
            color: 'inherit',
            textDecoration: 'underline',
            fontWeight: 600,
            '&:hover': {
              textDecoration: 'none',
            },
          }}
        >
          Firmware Update
        </Box>
        {' '}page
      </Typography>
    </Box>
  );
}
