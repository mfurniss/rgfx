/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

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
} from '@mui/material';

interface WifiConfigDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (ssid: string, password: string) => Promise<void>;
  isSending: boolean;
  error: string | null;
}

const WifiConfigDialog: React.FC<WifiConfigDialogProps> = ({
  open,
  onClose,
  onSubmit,
  isSending,
  error,
}) => {
  const [ssid, setSsid] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = () => {
    if (ssid.trim()) {
      void onSubmit(ssid.trim(), password);
    }
  };

  const handleClose = () => {
    if (!isSending) {
      setSsid('');
      setPassword('');
      onClose();
    }
  };

  const canSubmit = ssid.trim().length > 0 && !isSending;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configure WiFi</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
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
          {isSending ? 'Sending...' : 'Send to Device'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WifiConfigDialog;
