import React from 'react';
import { Typography } from '@mui/material';
import { RestartAlt as RestartAltIcon, Warning as WarningIcon } from '@mui/icons-material';
import type { Driver } from '@/types';
import ConfirmActionButton from '../common/confirm-action-button';

interface ResetDriverButtonProps {
  driver: Driver;
}

const ResetDriverButton: React.FC<ResetDriverButtonProps> = ({ driver }) => {
  return (
    <ConfirmActionButton
      label="Reset"
      pendingLabel="Resetting..."
      icon={<RestartAltIcon />}
      dialogIcon={<WarningIcon />}
      dialogTitle="Confirm Reset"
      dialogContent={
        <>
          <Typography sx={{ mb: 2 }}>
            This will reset <strong>{driver.id}</strong>.
          </Typography>
          <Typography sx={{ mb: 2 }}>The following will be erased:</Typography>
          <Typography component="ul" sx={{ mb: 2, pl: 2 }}>
            <li>Driver ID</li>
            <li>LED hardware configuration</li>
            <li>WiFi credentials</li>
          </Typography>
          <Typography color="error" sx={{ fontWeight: 'bold' }}>
            The driver will reboot immediately and must be reconfigured.
          </Typography>
        </>
      }
      color="error"
      onConfirm={async () => {
        await window.rgfx.sendDriverCommand(driver.id, 'reset');
      }}
      disabled={driver.state !== 'connected'}
      tooltipTitle="Reset: Erases device ID, LED configuration, and WiFi credentials"
    />
  );
};

export default ResetDriverButton;
