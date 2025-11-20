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

interface FlashResultDialogProps {
  open: boolean;
  success: boolean;
  message: string;
  onClose: () => void;
}

const FlashResultDialog: React.FC<FlashResultDialogProps> = ({
  open,
  success,
  message,
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
        <Typography>{message}</Typography>
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
