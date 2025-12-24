import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
} from '@mui/material';

type FlashMethod = 'usb' | 'ota';

interface ConfirmFlashDialogProps {
  open: boolean;
  firmwareVersion: string;
  flashMethod: FlashMethod;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmFlashDialog: React.FC<ConfirmFlashDialogProps> = ({
  open,
  firmwareVersion,
  flashMethod,
  onConfirm,
  onCancel,
}) => {
  const isUsb = flashMethod === 'usb';

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="md" fullWidth>
      <DialogTitle>Confirm Firmware Flash</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>
          You are about to flash firmware version <strong>{firmwareVersion}</strong>.
        </Typography>
        <Typography sx={{ mb: 2 }}>
          {isUsb
            ? 'This process will take approximately 1-2 minutes'
            : 'This process will take approximately 30 seconds per driver'}
          {' '}and <strong>cannot be interrupted</strong>.
        </Typography>
        <Typography sx={{ mb: 2 }}>
          {isUsb
            ? 'Do not disconnect the USB cable or close the application during flashing.'
            : 'Do not close the application or disconnect drivers from the network during flashing.'}
        </Typography>
        <Typography color="warning.main">
          Interrupting the flash may leave your device in an unusable state.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button onClick={onConfirm} variant="contained" color="warning">
          Start Update
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmFlashDialog;
