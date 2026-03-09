import React from 'react';
import { Alert, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

interface PageBannerProps {
  color: 'info' | 'warning';
  children: React.ReactNode;
  onClose?: () => void;
}

export function PageBanner({ color, children, onClose }: PageBannerProps) {
  return (
    <Alert
      severity={color}
      variant="filled"
      icon={false}
      action={
        onClose ? (
          <IconButton color="inherit" size="small" onClick={onClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        ) : undefined
      }
      sx={{
        borderRadius: 0,
        '& .MuiAlert-message': {
          width: '100%',
          textAlign: 'center',
          fontWeight: 500,
        },
        '& a, & button:not(.MuiIconButton-root)': {
          color: 'inherit',
          fontWeight: 600,
        },
      }}
    >
      {children}
    </Alert>
  );
}
