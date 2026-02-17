/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React, { useState, useEffect } from 'react';
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
  // Local state avoids propagating every keystroke up the form tree.
  // Only valid colors or blur events trigger onChange.
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const hexValue = valueToHex(localValue);
  const isInvalid = localValue !== '' && !isValidColor(localValue);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (isValidColor(newValue)) {
      onChange(newValue);
    }
  };

  const handleBlur = () => {
    if (isValidColor(localValue)) {
      onChange(localValue);
    } else {
      setLocalValue(value);
    }
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
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
        value={localValue}
        onChange={handleTextChange}
        onBlur={handleBlur}
        error={isInvalid}
        helperText={isInvalid ? 'Invalid color' : helperText}
        fullWidth={fullWidth}
        size="small"
        disabled={disabled}
      />
    </Box>
  );
}
