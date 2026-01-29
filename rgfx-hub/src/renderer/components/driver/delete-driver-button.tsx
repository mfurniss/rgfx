import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography } from '@mui/material';
import { Delete as DeleteIcon, Warning as WarningIcon } from '@mui/icons-material';
import type { Driver } from '@/types';
import ConfirmActionButton from '../common/confirm-action-button';

interface DeleteDriverButtonProps {
  driver: Driver;
}

const DeleteDriverButton: React.FC<DeleteDriverButtonProps> = ({ driver }) => {
  const navigate = useNavigate();

  return (
    <ConfirmActionButton
      label="Delete"
      pendingLabel="Deleting..."
      icon={<DeleteIcon />}
      dialogIcon={<WarningIcon />}
      dialogTitle="Delete Driver"
      dialogContent={
        <>
          <Typography sx={{ mb: 2 }}>
            This will permanently delete <strong>{driver.id}</strong> from the hub.
          </Typography>
          <Typography color="error" sx={{ fontWeight: 'bold' }}>
            This action cannot be undone. The driver will need to be rediscovered.
          </Typography>
        </>
      }
      color="error"
      onConfirm={async () => {
        await window.rgfx.deleteDriver(driver.id);
      }}
      onSuccess={() => {
        void navigate('/drivers');
      }}
      tooltipTitle="Permanently delete this driver from the hub"
    />
  );
};

export default DeleteDriverButton;
