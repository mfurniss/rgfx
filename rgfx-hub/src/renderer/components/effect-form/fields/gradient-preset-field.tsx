/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, FormHelperText, Box } from '@mui/material';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { gradientPresets, findPresetByGradient } from '@/renderer/data/gradient-presets';

interface GradientPresetFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  error?: string;
}

function GradientPreview({ gradient }: { gradient: string[] }) {
  // Build gradient with explicit color stop positions
  const colorStops = gradient.map((color, i) => {
    const position = (i / (gradient.length - 1)) * 100;

    return `${color} ${position}%`;
  });
  const gradientCss = `linear-gradient(to right, ${colorStops.join(', ')})`;

  return (
    <Box
      sx={{
        width: 60,
        height: 16,
        borderRadius: 0.5,
        background: gradientCss,
        outline: '1px solid',
        outlineColor: 'divider',
        flexShrink: 0,
      }}
    />
  );
}

export function GradientPresetField<T extends FieldValues>({
  name,
  control,
  label,
  error,
}: GradientPresetFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const colors = field.value as string[] | undefined;
        const currentPreset = colors ? findPresetByGradient(colors) : undefined;
        const selectedValue = currentPreset?.name ?? '';

        return (
          <FormControl fullWidth error={!!error} size="small">
            <InputLabel>{label}</InputLabel>
            <Select
              value={selectedValue}
              label={label}
              onChange={(e) => {
                const { value } = e.target;

                if (value === '') {
                  field.onChange(undefined);
                } else {
                  const preset = gradientPresets.find((p) => p.name === value);

                  if (preset) {
                    field.onChange(preset.gradient);
                  }
                }
              }}
            >
              <MenuItem value="">
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'text.secondary' }}>
                  None
                </Box>
              </MenuItem>
              {gradientPresets.map((preset) => (
                <MenuItem key={preset.name} value={preset.name}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <GradientPreview gradient={preset.gradient} />
                    {preset.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {error && <FormHelperText>{error}</FormHelperText>}
          </FormControl>
        );
      }}
    />
  );
}
