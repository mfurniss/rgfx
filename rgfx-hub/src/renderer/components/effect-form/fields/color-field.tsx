/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { Box, TextField } from '@mui/material';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { valueToHex } from '@/renderer/utils/color';

interface ColorFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  namedColors: readonly string[];
  error?: string;
  disabled?: boolean;
}

export function ColorField<T extends FieldValues>({
  name,
  control,
  label,
  error,
  disabled,
}: ColorFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const displayValue = field.value ?? '';
        const hexValue = valueToHex(field.value);

        const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          field.onChange(e.target.value);
        };

        const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          field.onChange(e.target.value);
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
              value={displayValue}
              onChange={handleTextChange}
              error={!!error}
              helperText={error ?? "Named color (e.g. 'red', 'random') or hex (#RRGGBB)"}
              fullWidth
              size="small"
              disabled={disabled}
            />
          </Box>
        );
      }}
    />
  );
}
