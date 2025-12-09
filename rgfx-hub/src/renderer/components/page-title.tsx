import React, { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';

interface PageTitleProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
}

export function PageTitle({ icon, title, subtitle }: PageTitleProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, mt: 1 }}>
      {icon}
      <Box>
        <Typography variant="h5" sx={{ lineHeight: 1.2 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ mt: 1 }} variant="body1" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
