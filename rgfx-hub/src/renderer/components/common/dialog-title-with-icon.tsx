import React from 'react';
import { DialogTitle, Box } from '@mui/material';

type ColorType = 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';

interface DialogTitleWithIconProps {
  /** Icon to display before the title */
  icon: React.ReactNode;
  /** Title text */
  title: string;
  /** Color to apply to the icon via cloneElement (optional) */
  iconColor?: ColorType;
  /** Color for the entire title text (e.g., 'success.main' or 'error.main') */
  titleColor?: string;
  /** Optional action element (e.g., close button) shown at the end */
  action?: React.ReactNode;
}

/**
 * A standardized dialog title with icon, supporting optional action slot.
 * Consolidates the common pattern of icon + title in dialog headers.
 */
export const DialogTitleWithIcon: React.FC<DialogTitleWithIconProps> = ({
  icon,
  title,
  iconColor,
  titleColor,
  action,
}) => {
  const renderedIcon = React.isValidElement(icon) && iconColor
    ? React.cloneElement(icon as React.ReactElement<{ color?: string }>, { color: iconColor })
    : icon;

  return (
    <DialogTitle
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        ...(action && { justifyContent: 'space-between' }),
        ...(titleColor && { color: titleColor }),
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {renderedIcon}
        {title}
      </Box>
      {action}
    </DialogTitle>
  );
};
