/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { Box, TextField, InputAdornment } from '@mui/material';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

interface ColorFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  namedColors: readonly string[];
  error?: string;
}

const colorSwatchMap: Record<string, string> = {
  random: '#808080',
  red: '#ff0000',
  green: '#00ff00',
  blue: '#0000ff',
  white: '#ffffff',
  black: '#000000',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  lime: '#00ff00',
  aqua: '#00ffff',
  navy: '#000080',
  teal: '#008080',
  olive: '#808000',
  maroon: '#800000',
  silver: '#c0c0c0',
  gray: '#808080',
  grey: '#808080',
};

function valueToHex(value: unknown): string {
  if (typeof value === 'number') {
    return '#' + value.toString(16).padStart(6, '0');
  }

  if (typeof value === 'string') {
    // Check if it's a named color
    if (colorSwatchMap[value]) {
      return colorSwatchMap[value];
    }

    // Check if it's already a hex color
    if (/^#[0-9a-fA-F]{6}$/.exec(value)) {
      return value;
    }

    if (/^[0-9a-fA-F]{6}$/.exec(value)) {
      return '#' + value;
    }
  }

  return '#808080';
}

export function ColorField<T extends FieldValues>({
  name,
  control,
  label,
  error,
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
          <TextField
            label={label}
            value={displayValue}
            onChange={handleTextChange}
            error={!!error}
            helperText={error ?? "Named color (e.g. 'red', 'random') or hex (#RRGGBB)"}
            fullWidth
            size="small"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Box
                      component="input"
                      type="color"
                      value={hexValue}
                      onChange={handleColorChange}
                      sx={{
                        width: 24,
                        height: 24,
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        backgroundColor: 'transparent',
                        '&::-webkit-color-swatch-wrapper': {
                          padding: 0,
                        },
                        '&::-webkit-color-swatch': {
                          border: '1px solid rgba(255,255,255,0.3)',
                          borderRadius: '4px',
                        },
                      }}
                    />
                  </InputAdornment>
                ),
              },
            }}
          />
        );
      }}
    />
  );
}
