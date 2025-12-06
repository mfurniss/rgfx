import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
} from '@mui/material';

interface ConfirmFlashDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmFlashDialog: React.FC<ConfirmFlashDialogProps> = ({ open, onConfirm, onCancel }) => {
  return (
    <Dialog open={open} onClose={onCancel} maxWidth="sm" fullWidth>
      <DialogTitle>Confirm Firmware Flash</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          This process will take approximately 1-2 minutes
          and <strong>cannot be interrupted</strong>.
        </Typography>
        <Typography sx={{ mb: 2 }}>
          Do not disconnect the USB cable or close the application during flashing.
        </Typography>
        <Typography color="warning.main">
          Interrupting the flash may leave your device in an unusable state.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="warning">
          Start Flashing
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmFlashDialog;
