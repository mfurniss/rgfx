/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { Box, TextField } from '@mui/material';
import { isValidColor, valueToHex } from '@/renderer/utils/color';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  helperText?: string;
  fullWidth?: boolean;
  label?: string;
}

export function ColorPicker({
  value,
  onChange,
  disabled,
  helperText,
  fullWidth = true,
  label,
}: ColorPickerProps) {
  const hexValue = valueToHex(value);
  const isInvalid = value !== '' && !isValidColor(value);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      <Box
        component="input"
        type="color"
        value={hexValue}
        onChange={handleColorChange}
        disabled={disabled}
        sx={{
          width: 32,
          height: 32,
          border: 'none',
          padding: 0,
          mt: 0.5,
          cursor: disabled ? 'not-allowed' : 'pointer',
          backgroundColor: 'transparent',
          opacity: disabled ? 0.5 : 1,
          '&::-webkit-color-swatch-wrapper': {
            padding: 0,
          },
          '&::-webkit-color-swatch': {
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '4px',
          },
        }}
      />
      <TextField
        label={label}
        value={value}
        onChange={handleTextChange}
        error={isInvalid}
        helperText={isInvalid ? 'Invalid color' : helperText}
        fullWidth={fullWidth}
        size="small"
        disabled={disabled}
      />
    </Box>
  );
}
