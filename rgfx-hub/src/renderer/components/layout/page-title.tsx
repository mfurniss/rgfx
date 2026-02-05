import React, { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, IconButton, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

interface PageTitleProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  backPath?: string;
  backLabel?: string;
  noGutters?: boolean;
}

export function PageTitle({
  icon, title, subtitle, backPath, backLabel, noGutters,
}: PageTitleProps) {
  const navigate = useNavigate();

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 2, mb: noGutters ? 0 : 3, mt: noGutters ? 0 : 1,
    }}>
      {backPath && (
        <IconButton
          onClick={() => {
            void navigate(backPath);
          }}
          size="small"
          aria-label={backLabel ?? 'Go back'}
        >
          <ArrowBackIcon />
        </IconButton>
      )}
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
