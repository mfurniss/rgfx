import React, { useState } from 'react';
import {
  Button,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import { RestartAlt as RestartAltIcon } from '@mui/icons-material';
import type { Driver } from '~/src/types';

interface RebootDriverButtonProps {
  driver: Driver;
}

const RebootDriverButton: React.FC<RebootDriverButtonProps> = ({ driver }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rebootPending, setRebootPending] = useState(false);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleConfirmReboot = () => {
    setRebootPending(true);
    setDialogOpen(false);

    void (async () => {
      try {
        await window.rgfx.sendDriverCommand(driver.id, 'reboot');
      } catch (error) {
        console.error('Failed to reboot driver:', error);
      } finally {
        setRebootPending(false);
      }
    })();
  };

  return (
    <>
      <Tooltip title="Reboot: Restart the driver without erasing configuration" arrow>
        <span>
          <Button
            variant="outlined"
            color="warning"
            size="small"
            startIcon={<RestartAltIcon />}
            onClick={handleOpenDialog}
            disabled={!driver.connected || rebootPending}
          >
            {rebootPending ? 'Rebooting...' : 'Reboot'}
          </Button>
        </span>
      </Tooltip>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RestartAltIcon color="warning" />
          Confirm Reboot
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This will restart <strong>{driver.id}</strong>.
          </Typography>
          <Typography sx={{ mb: 2 }}>
            All configuration will be preserved, including:
          </Typography>
          <Typography component="ul" sx={{ mb: 2, pl: 2 }}>
            <li>Device ID</li>
            <li>LED hardware configuration</li>
            <li>WiFi credentials</li>
          </Typography>
          <Typography color="text.secondary">
            The driver will reconnect automatically after restarting.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleConfirmReboot} variant="contained" color="warning">
            Reboot
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RebootDriverButton;
