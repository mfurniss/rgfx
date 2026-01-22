import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
} from '@mui/material';
import { CheckCircle as SuccessIcon, Error as ErrorIcon } from '@mui/icons-material';
import type { FlashMethod } from '../../hooks/use-flash-state';

interface FlashResultDialogProps {
  open: boolean;
  success: boolean;
  message: string;
  flashMethod: FlashMethod | null;
  onClose: () => void;
}

function getFailureHelpText(flashMethod: FlashMethod | null): string {
  if (flashMethod === 'ota') {
    return 'If this OTA error persists try updating via USB serial.';
  }
  return 'Check that no other application is using the serial port and the device is connected.';
}

const FlashResultDialog: React.FC<FlashResultDialogProps> = ({
  open,
  success,
  message,
  flashMethod,
  onClose,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: success ? 'success.main' : 'error.main',
        }}
      >
        {success ? <SuccessIcon /> : <ErrorIcon />}
        {success ? 'Flash Complete' : 'Flash Failed'}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ pb: success ? 0 : 2 }}>{message}</Typography>
        {!success && <Typography>{getFailureHelpText(flashMethod)}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained" autoFocus>
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FlashResultDialog;
