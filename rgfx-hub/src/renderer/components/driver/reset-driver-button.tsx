import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import { RestartAlt as RestartAltIcon, Warning as WarningIcon } from '@mui/icons-material';
import type { Driver } from '@/types';
import SuperButton from '../common/super-button';

interface ResetDriverButtonProps {
  driver: Driver;
}

const ResetDriverButton: React.FC<ResetDriverButtonProps> = ({ driver }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetPending, setResetPending] = useState(false);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleConfirmReset = () => {
    setResetPending(true);
    setDialogOpen(false);

    void (async () => {
      try {
        await window.rgfx.sendDriverCommand(driver.id, 'reset');
      } catch (error) {
        console.error('Failed to reset driver:', error);
      } finally {
        setResetPending(false);
      }
    })();
  };

  return (
    <>
      <SuperButton
        tooltipTitle="Reset: Erases device ID, LED configuration, and WiFi credentials"
        icon={<RestartAltIcon />}
        variant="outlined"
        color="error"
        size="small"
        onClick={handleOpenDialog}
        disabled={driver.state !== 'connected'}
        busy={resetPending}
      >
        {resetPending ? 'Resetting...' : 'Reset'}
      </SuperButton>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          Confirm Reset
        </DialogTitle>
        <DialogContent>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleConfirmReset} variant="contained" color="error">
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ResetDriverButton;
