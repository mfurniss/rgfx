import React, { useState } from 'react';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CopyIcon from '@mui/icons-material/ContentCopy';

interface TransformerCodePanelProps {
  broadcastCode: string;
}

export const TransformerCodePanel = React.memo(
  function TransformerCodePanel({ broadcastCode }: TransformerCodePanelProps) {
    const [copySuccess, setCopySuccess] = useState(false);

    const handleCopy = async () => {
      await navigator.clipboard.writeText(broadcastCode);
      setCopySuccess(true);
      setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    };

    return (
      <Stack spacing={2}>
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Typography variant="subtitle2">
            Copy this code to the transformer JavaScript (.js) file.
          </Typography>
          <Tooltip title={copySuccess ? 'Copied!' : 'Copy to clipboard'}>
            <IconButton onClick={() => {
              void handleCopy();
            }} size="small">
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box
          component="pre"
          sx={{
            p: 2,
            bgcolor: 'grey.900',
            color: 'grey.100',
            borderRadius: 1,
            overflow: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            m: 0,
          }}
        >
          {broadcastCode}
        </Box>
      </Stack>
    );
  },
);
