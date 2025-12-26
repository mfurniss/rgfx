import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
} from '@mui/material';
import { Delete as DeleteIcon, Warning as WarningIcon } from '@mui/icons-material';
import type { Driver } from '@/types';
import SuperButton from '../common/super-button';

interface DeleteDriverButtonProps {
  driver: Driver;
}

const DeleteDriverButton: React.FC<DeleteDriverButtonProps> = ({ driver }) => {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleConfirmDelete = () => {
    setDeletePending(true);
    setDialogOpen(false);

    void (async () => {
      try {
        await window.rgfx.deleteDriver(driver.id);
        void navigate('/drivers');
      } catch (error) {
        console.error('Failed to delete driver:', error);
      } finally {
        setDeletePending(false);
      }
    })();
  };

  return (
    <>
      <SuperButton
        tooltipTitle="Permanently delete this driver from the hub"
        icon={<DeleteIcon />}
        variant="outlined"
        color="error"
        size="small"
        onClick={handleOpenDialog}
        busy={deletePending}
      >
        {deletePending ? 'Deleting...' : 'Delete'}
      </SuperButton>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          Delete Driver
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            This will permanently delete <strong>{driver.id}</strong> from the hub.
          </Typography>
          <Typography color="error" sx={{ fontWeight: 'bold' }}>
            This action cannot be undone. The driver will need to be rediscovered.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DeleteDriverButton;
