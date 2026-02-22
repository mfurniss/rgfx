import React from 'react';
import { Box, Typography } from '@mui/material';

interface PageBannerProps {
  color: 'info' | 'warning';
  children: React.ReactNode;
}

export function PageBanner({ color, children }: PageBannerProps) {
  return (
    <Box
      sx={{
        backgroundColor: `${color}.main`,
        color: `${color}.contrastText`,
        px: 2,
        py: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        '& a': {
          color: 'inherit',
          fontWeight: 600,
        },
      }}
    >
      <Typography variant="body1" sx={{ fontWeight: 500 }}>
        {children}
      </Typography>
    </Box>
  );
}
