import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import ConfirmActionButton from '../common/confirm-action-button';
import type { DriverButtonProps } from './types';

const DeleteDriverButton: React.FC<DriverButtonProps> = ({ driver }) => {
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
