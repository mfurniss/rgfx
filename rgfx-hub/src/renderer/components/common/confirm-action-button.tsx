/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React, { useState, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import type { ButtonProps, SxProps, Theme } from '@mui/material';
import SuperButton from './super-button';

type ColorType = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';

interface ConfirmActionButtonProps {
  /** Button label when idle */
  label: string;
  /** Button label while action is pending (optional, defaults to label + "...") */
  pendingLabel?: string;
  /** Icon displayed in the button */
  icon: React.ReactNode;
  /** Icon displayed in the dialog title (optional, defaults to icon) */
  dialogIcon?: React.ReactNode;
  /** Dialog title text */
  dialogTitle: string;
  /** Dialog content - can be JSX for complex content */
  dialogContent: React.ReactNode;
  /** Confirm button label (defaults to label) */
  confirmLabel?: string;
  /** Color theme for button and confirm action */
  color?: ColorType;
  /** Async action to execute on confirmation */
  onConfirm: () => Promise<void>;
  /** Called on successful completion (optional) */
  onSuccess?: () => void;
  /** Called on error (optional, defaults to console.error) */
  onError?: (error: unknown) => void;
  /** Whether the button should be disabled */
  disabled?: boolean;
  /** Tooltip text */
  tooltipTitle?: string;
  /** Button size */
  size?: ButtonProps['size'];
  /** Button variant */
  variant?: ButtonProps['variant'];
  /** Custom sx props for the button */
  sx?: SxProps<Theme>;
}

/**
 * A button that shows a confirmation dialog before executing an async action.
 * Consolidates the common pattern of dialog state + pending state + async execution.
 */
const ConfirmActionButton: React.FC<ConfirmActionButtonProps> = ({
  label,
  pendingLabel,
  icon,
  dialogIcon,
  dialogTitle,
  dialogContent,
  confirmLabel,
  color = 'primary',
  onConfirm,
  onSuccess,
  onError,
  disabled = false,
  tooltipTitle,
  size = 'medium',
  variant = 'outlined',
  sx,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handleOpenDialog = useCallback(() => {
    setDialogOpen(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    if (!pending) {
      setDialogOpen(false);
    }
  }, [pending]);

  const handleConfirm = useCallback(() => {
    setPending(true);
    setDialogOpen(false);

    void (async () => {
      try {
        await onConfirm();
        onSuccess?.();
      } catch (error) {
        if (onError) {
          onError(error);
        } else {
          console.error('Action failed:', error);
        }
      } finally {
        setPending(false);
      }
    })();
  }, [onConfirm, onSuccess, onError]);

  const effectivePendingLabel = pendingLabel ?? `${label}...`;
  const effectiveConfirmLabel = confirmLabel ?? label;
  const effectiveDialogIcon = dialogIcon ?? icon;

  return (
    <>
      <SuperButton
        icon={icon}
        variant={variant}
        color={color}
        size={size}
        onClick={handleOpenDialog}
        disabled={disabled}
        busy={pending}
        tooltipTitle={tooltipTitle}
        sx={sx}
      >
        {pending ? effectivePendingLabel : label}
      </SuperButton>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {React.isValidElement(effectiveDialogIcon)
            ? React.cloneElement(effectiveDialogIcon as React.ReactElement<{ color?: string }>, {
              color,
            })
            : effectiveDialogIcon}
          {dialogTitle}
        </DialogTitle>
        <DialogContent>{dialogContent}</DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleConfirm} variant="contained" color={color}>
            {effectiveConfirmLabel}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ConfirmActionButton;
