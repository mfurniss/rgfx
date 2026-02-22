import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  CircularProgress,
  Alert,
  Typography,
} from '@mui/material';

interface WifiConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (ssid: string, password: string) => Promise<void>;
  isSending: boolean;
  error: string | null;
  description?: string;
  submitLabel?: string;
  sendingLabel?: string;
  initialSsid?: string;
  initialPassword?: string;
  onCredentialsSave?: (ssid: string, password: string) => void;
}

const WifiConfigDialog: React.FC<WifiConfigDialogProps> = ({
  open,
  onClose,
  onSubmit,
  isSending,
  error,
  description,
  submitLabel = 'Send to Device',
  sendingLabel = 'Sending...',
  initialSsid = '',
  initialPassword = '',
  onCredentialsSave,
}) => {
  const [ssid, setSsid] = useState(initialSsid);
  const [password, setPassword] = useState(initialPassword);

  const handleSubmit = () => {
    if (ssid.trim()) {
      onCredentialsSave?.(ssid.trim(), password);
      void onSubmit(ssid.trim(), password);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      onClose();
    }
  };

  const canSubmit = ssid.trim().length > 0 && !isSending;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configure Driver WiFi</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {description}
            </Typography>
          )}
          <TextField
            autoFocus
            label="SSID (Network Name)"
            fullWidth
            value={ssid}
            onChange={(e) => {
              setSsid(e.target.value);
            }}
            disabled={isSending}
            sx={{ mb: 2 }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) {
                handleSubmit();
              }
            }}
          />

          <TextField
            label="Password"
            fullWidth
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSubmit) {
                handleSubmit();
              }
            }}
          />

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={isSending}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!canSubmit}
          startIcon={isSending ? <CircularProgress size={16} /> : null}
        >
          {isSending ? sendingLabel : submitLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WifiConfigDialog;
