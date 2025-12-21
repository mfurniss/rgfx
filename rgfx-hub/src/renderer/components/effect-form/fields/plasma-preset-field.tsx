/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, FormHelperText, Box } from '@mui/material';
import { Controller, useFormContext, type Control, type FieldValues, type Path } from 'react-hook-form';
import { plasmaPresets, findPresetByGradient } from '../../../data/plasma-presets';

interface PlasmaPresetFieldProps<T extends FieldValues> {
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

export function PlasmaPresetField<T extends FieldValues>({
  name,
  control,
  label,
  error,
}: PlasmaPresetFieldProps<T>) {
  const { setValue } = useFormContext<T>();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const currentGradient = field.value as string[] | undefined;
        const currentPreset = currentGradient ? findPresetByGradient(currentGradient) : undefined;
        const selectedValue = currentPreset?.name ?? '';

        return (
          <FormControl fullWidth error={!!error} size="small">
            <InputLabel>{label}</InputLabel>
            <Select
              value={selectedValue}
              label={label}
              onChange={(e) => {
                const preset = plasmaPresets.find((p) => p.name === e.target.value);

                if (preset) {
                  field.onChange(preset.gradient);
                  setValue('speed' as Path<T>, preset.speed as T[keyof T]);
                  setValue('scale' as Path<T>, preset.scale as T[keyof T]);
                }
              }}
            >
              {plasmaPresets.map((preset) => (
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
