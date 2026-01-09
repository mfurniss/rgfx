/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React, { useState } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PaletteIcon from '@mui/icons-material/Palette';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { MAX_GRADIENT_COLORS } from '@/config/constants';
import SuperButton from '@/renderer/components/common/super-button';
import { PresetSelectorModal } from '../preset-selector-modal';
import type { PresetData } from '@/schemas';

interface GradientValue {
  colors: string[];
  orientation: 'horizontal' | 'vertical';
}

interface BackgroundGradientFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  error?: string;
}

export function BackgroundGradientField<T extends FieldValues>({
  name,
  control,
  label,
  error,
}: BackgroundGradientFieldProps<T>) {
  const [presetModalOpen, setPresetModalOpen] = useState(false);

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const value = field.value as GradientValue | undefined;
        const colors: string[] = value?.colors ?? [];
        const orientation = value?.orientation ?? 'horizontal';

        const updateValue = (newColors: string[], newOrientation: string) => {
          if (newColors.length === 0) {
            field.onChange(null);
          } else {
            field.onChange({ colors: newColors, orientation: newOrientation });
          }
        };

        const handleColorChange = (index: number, newColor: string) => {
          const newColors = [...colors];
          newColors[index] = newColor;
          updateValue(newColors, orientation);
        };

        const handleAddColor = () => {
          if (colors.length < MAX_GRADIENT_COLORS) {
            const lastColor = colors[colors.length - 1] ?? '#FF0000';
            updateValue([...colors, lastColor], orientation);
          }
        };

        const handleRemoveColor = (index: number) => {
          const newColors = colors.filter((_, i) => i !== index);
          updateValue(newColors, orientation);
        };

        const handleOrientationChange = (newOrientation: string) => {
          updateValue(colors, newOrientation);
        };

        const handlePresetSelect = (data: PresetData) => {
          // Apply preset gradient, preserve current orientation
          updateValue(data.gradient, orientation);
        };

        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {label} ({colors.length}/{MAX_GRADIENT_COLORS})
            </Typography>

            <Button
              variant="outlined"
              startIcon={<PaletteIcon />}
              onClick={() => {
                setPresetModalOpen(true);
              }}
              sx={{ mb: 1 }}
            >
              Select Preset
            </Button>

            <PresetSelectorModal
              open={presetModalOpen}
              type="gradient"
              onClose={() => {
                setPresetModalOpen(false);
              }}
              onSelect={handlePresetSelect}
            />

            {/* Gradient preview bar */}
            {colors.length > 0 && (
              <Box
                sx={{
                  height: 24,
                  borderRadius: 1,
                  mb: 1,
                  background:
                    colors.length >= 2
                      ? `linear-gradient(to ${orientation === 'horizontal' ? 'right' : 'bottom'}, ${colors.join(', ')})`
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
                    sx={{ width: 100 }}
                    slotProps={{
                      input: {
                        sx: { fontFamily: 'monospace', fontSize: '0.875rem' },
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
                onClick={handleAddColor}
                disabled={colors.length >= MAX_GRADIENT_COLORS}
                icon={<AddIcon />}
                sx={{ alignSelf: 'flex-start' }}
              >
                Add Color
              </SuperButton>

              {/* Orientation selector - only show when there are colors */}
              {colors.length > 0 && (
                <FormControl size="small" sx={{ mt: 1 }}>
                  <InputLabel>Orientation</InputLabel>
                  <Select
                    value={orientation}
                    label="Orientation"
                    onChange={(e) => {
                      handleOrientationChange(e.target.value);
                    }}
                  >
                    <MenuItem value="horizontal">Horizontal</MenuItem>
                    <MenuItem value="vertical">Vertical</MenuItem>
                  </Select>
                </FormControl>
              )}
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
