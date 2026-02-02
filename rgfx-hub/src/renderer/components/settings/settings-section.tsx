import React, { type ReactNode } from 'react';
import { Paper, Typography, type SxProps, type Theme } from '@mui/material';

interface SettingsSectionProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  sx?: SxProps<Theme>;
}

export function SettingsSection({ title, subtitle, children, sx }: SettingsSectionProps) {
  // Normalize sx to array for composition (same pattern as super-button.tsx)
  const sxArray: SxProps<Theme> = Array.isArray(sx) ? sx : sx ? [sx] : [];

  return (
    <Paper sx={[{ p: 3 }, ...sxArray]}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {subtitle}
        </Typography>
      )}
      {children}
    </Paper>
  );
}
