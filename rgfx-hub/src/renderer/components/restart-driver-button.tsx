import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import type { Driver } from '@/types';
import SuperButton from './super-button';

interface RestartDriverButtonProps {
  driver: Driver;
}

const RestartDriverButton: React.FC<RestartDriverButtonProps> = ({ driver }) => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleConfirmRestart = () => {
    setDialogOpen(false);
    window.rgfx.restartDriver(driver.id).catch((error: unknown) => {
      console.error('Failed to restart driver:', error);
    });
  };

  return (
    <>
      <SuperButton
        icon={<RefreshIcon />}
        variant="outlined"
        color="warning"
        size="small"
        onClick={handleOpenDialog}
        disabled={driver.state !== 'connected'}
      >
        Restart
      </SuperButton>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RefreshIcon color="warning" />
          Confirm Restart
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This will restart <strong>{driver.id}</strong>.
          </Typography>
          <Typography>
            The driver will reboot and reconnect automatically, all settings will be preserved.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleConfirmRestart} variant="contained" color="warning">
            Restart
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RestartDriverButton;
