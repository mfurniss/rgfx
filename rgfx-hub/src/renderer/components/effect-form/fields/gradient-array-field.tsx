/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { Box, IconButton, Typography, Tooltip, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { MAX_GRADIENT_COLORS } from '@/config/constants';
import SuperButton from '@/renderer/components/common/super-button';

interface GradientArrayFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  error?: string;
}

export function GradientArrayField<T extends FieldValues>({
  name,
  control,
  label,
  error,
}: GradientArrayFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const colors: string[] = Array.isArray(field.value) ? field.value : [];

        const handleColorChange = (index: number, newColor: string) => {
          const newColors = [...colors];
          newColors[index] = newColor;
          field.onChange(newColors);
        };

        const handleAddColor = () => {
          if (colors.length < MAX_GRADIENT_COLORS) {
            const lastColor = colors[colors.length - 1] ?? '#FF0000';
            field.onChange([...colors, lastColor]);
          }
        };

        const handleRemoveColor = (index: number) => {
          const newColors = colors.filter((_, i) => i !== index);
          field.onChange(newColors.length > 0 ? newColors : undefined);
        };

        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {label} ({colors.length}/{MAX_GRADIENT_COLORS})
            </Typography>

            {/* Gradient preview bar */}
            {colors.length > 0 && (
              <Box
                sx={{
                  height: 24,
                  borderRadius: 1,
                  mb: 1,
                  background: colors.length >= 2
                    ? `linear-gradient(to right, ${colors.join(', ')})`
                    : colors[0],
                }}
              />
            )}

            {/* Color stops */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {colors.map((color, index) => (
                <Box
                  key={index}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box
                    component="input"
                    type="color"
                    value={color}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      handleColorChange(index, e.target.value);
                    }}
                    sx={{
                      width: 32,
                      height: 32,
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
                  <TextField
                    size="small"
                    value={color}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      handleColorChange(index, e.target.value);
                    }}
                    sx={{
                      width: 100,
                      '& .MuiInputBase-input': {
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        py: 0.75,
                        px: 1,
                      },
                    }}
                  />
                  <Tooltip title="Remove color">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => {
                          handleRemoveColor(index);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              ))}

              {/* Add color button */}
              <SuperButton
                variant="outlined"
                size="small"
                onClick={handleAddColor}
                disabled={colors.length >= MAX_GRADIENT_COLORS}
                icon={<AddIcon />}
              >
                Add Color
              </SuperButton>
            </Box>

            {error && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                {error}
              </Typography>
            )}
          </Box>
        );
      }}
    />
  );
}
