/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { spritePresets, findPresetByImage } from '../../../data/sprite-presets';

interface SpritePresetFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  error?: string;
}

export function SpritePresetField<T extends FieldValues>({
  name,
  control,
  label,
  error,
}: SpritePresetFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const currentImage = field.value as string[] | undefined;
        const currentPreset = currentImage ? findPresetByImage(currentImage) : undefined;
        const selectedValue = currentPreset?.name ?? '';

        return (
          <FormControl fullWidth error={!!error} size="small">
            <InputLabel>{label}</InputLabel>
            <Select
              value={selectedValue}
              label={label}
              onChange={(e) => {
                const preset = spritePresets.find((p) => p.name === e.target.value);

                if (preset) {
                  field.onChange(preset.image);
                }
              }}
            >
              {spritePresets.map((preset) => (
                <MenuItem key={preset.name} value={preset.name}>
                  {preset.name}
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
