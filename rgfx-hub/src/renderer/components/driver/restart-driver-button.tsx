import React from 'react';
import { Typography } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import type { Driver } from '@/types';
import ConfirmActionButton from '../common/confirm-action-button';

interface RestartDriverButtonProps {
  driver: Driver;
}

const RestartDriverButton: React.FC<RestartDriverButtonProps> = ({ driver }) => {
  return (
    <ConfirmActionButton
      label="Restart"
      pendingLabel="Restarting..."
      icon={<RefreshIcon />}
      dialogTitle="Confirm Restart"
      dialogContent={
        <>
          <Typography sx={{ mb: 2 }}>
            This will restart <strong>{driver.id}</strong>.
          </Typography>
          <Typography>
            The driver will reboot and reconnect automatically, all settings will be preserved.
          </Typography>
        </>
      }
      color="warning"
      onConfirm={async () => {
        await window.rgfx.restartDriver(driver.id);
      }}
      onError={(error) => {
        console.error('Failed to restart driver:', error);
      }}
      disabled={driver.state !== 'connected'}
    />
  );
};

export default RestartDriverButton;
