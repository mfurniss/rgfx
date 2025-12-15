import React from 'react';
import { Button, Tooltip, CircularProgress } from '@mui/material';
import type { ButtonProps } from '@mui/material';

interface SuperButtonProps extends Omit<ButtonProps, 'startIcon' | 'children'> {
  children: React.ReactNode;
  tooltipTitle?: string;
  icon?: React.ReactNode;
  busyIcon?: React.ReactNode;
  busy?: boolean;
}

const SuperButton: React.FC<SuperButtonProps> = ({
  tooltipTitle,
  icon,
  busyIcon = <CircularProgress size={20} color="inherit" />,
  busy = false,
  disabled,
  children,
  ...buttonProps
}) => {
  const effectiveIcon = busy ? busyIcon : icon;

  const button = (
    <Button
      {...buttonProps}
      disabled={(disabled ?? false) || busy}
      startIcon={effectiveIcon}
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
