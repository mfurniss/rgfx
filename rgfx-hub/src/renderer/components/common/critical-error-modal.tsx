import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/ErrorOutline';
import FolderIcon from '@mui/icons-material/FolderOpen';
import CopyIcon from '@mui/icons-material/ContentCopy';
import type { SystemError } from '@/types';
import { DialogTitleWithIcon } from './dialog-title-with-icon';

interface CriticalErrorModalProps {
  error: SystemError;
}

export function CriticalErrorModal({ error }: CriticalErrorModalProps): React.ReactElement {
  const handleShowInFolder = (): void => {
    if (error.filePath) {
      void window.rgfx.showInFolder(error.filePath);
    }
  };

  const handleCopyPath = (): void => {
    if (error.filePath) {
      void navigator.clipboard.writeText(error.filePath);
    }
  };

  const handleQuit = (): void => {
    window.rgfx.quitApp();
  };

  return (
    <Dialog
      open={true}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown
      onClose={(_event, reason) => {
        // Prevent closing via backdrop click
        if (reason === 'backdropClick') {
          return;
        }
      }}
    >
      <DialogTitleWithIcon icon={<ErrorIcon />} title="Configuration Error" iconColor="error" />
      <DialogContent>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message}
        </Alert>

        {error.filePath && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              bgcolor: 'action.hover',
              p: 1,
              borderRadius: 1,
              my: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                flex: 1,
                wordBreak: 'break-all',
              }}
            >
              {error.filePath}
            </Typography>
            <Tooltip title="Copy path">
              <IconButton size="small" onClick={handleCopyPath}>
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Show in folder">
              <IconButton size="small" onClick={handleShowInFolder}>
                <FolderIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {error.details && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              <strong>Details:</strong>
            </Typography>
            <Box
              sx={{
                bgcolor: 'grey.900',
                p: 1.5,
                borderRadius: 1,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  color: 'error.light',
                }}
              >
                {error.details}
              </Typography>
            </Box>
          </Box>
        )}

        <Alert severity="warning" sx={{ mt: 2 }}>
          The application cannot continue until this file is fixed manually. Please edit the file
          to correct the error, then restart RGFX Hub.
        </Alert>
      </DialogContent>
      <DialogActions>
        {error.filePath && (
          <Button onClick={handleShowInFolder} startIcon={<FolderIcon />}>
            Show File Location
          </Button>
        )}
        <Button onClick={handleQuit} variant="contained" color="error">
          Quit Application
        </Button>
      </DialogActions>
    </Dialog>
  );
}
