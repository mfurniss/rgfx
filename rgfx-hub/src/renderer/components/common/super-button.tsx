import React from 'react';
import { Button, Tooltip, CircularProgress } from '@mui/material';
import type { ButtonProps, SxProps, Theme } from '@mui/material';

interface SuperButtonProps extends Omit<ButtonProps, 'startIcon' | 'children' | 'sx'> {
  children: React.ReactNode;
  tooltipTitle?: string;
  icon?: React.ReactNode;
  busyIcon?: React.ReactNode;
  busy?: boolean;
  sx?: SxProps<Theme>;
}

const SuperButton: React.FC<SuperButtonProps> = ({
  tooltipTitle,
  icon,
  busyIcon = <CircularProgress size={20} color="inherit" />,
  busy = false,
  disabled,
  children,
  sx,
  ...buttonProps
}) => {
  const effectiveIcon = busy ? busyIcon : icon;

  const sxArray: SxProps<Theme> = Array.isArray(sx) ? sx : sx ? [sx] : [];

  const button = (
    <Button
      {...buttonProps}
      disabled={(disabled ?? false) || busy}
      startIcon={effectiveIcon}
      sx={[{ whiteSpace: 'nowrap', flexShrink: 0 }, ...sxArray]}
    >
      {children}
    </Button>
  );

  if (tooltipTitle) {
    return (
      <Tooltip title={tooltipTitle} arrow disableInteractive>
        <span>{button}</span>
      </Tooltip>
    );
  }

  return button;
};

export default SuperButton;
