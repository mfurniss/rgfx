/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { TextField } from '@mui/material';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { z } from 'zod';

const centerValueSchema = z.union([z.literal('random'), z.number()]);

interface CenterFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
}

export function CenterField<T extends FieldValues>({
  name,
  control,
  label,
}: CenterFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const rawValue = field.value as string | number | undefined;
        const displayValue = rawValue === 'random' ? 'random' : (rawValue ?? '').toString();

        const result = centerValueSchema.safeParse(rawValue);
        const isValid = rawValue === undefined || rawValue === '' || result.success;

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          const val = e.target.value.trim().toLowerCase();

          if (val === '' || val === 'random') {
            field.onChange(val === '' ? '' : 'random');
          } else {
            const num = parseFloat(val);
            field.onChange(isNaN(num) ? val : num);
          }
        };

        return (
          <TextField
            label={label}
            value={displayValue}
            onChange={handleChange}
            fullWidth
            size="small"
            error={!isValid}
            helperText={isValid ? "Number (0-100) or 'random'" : "Must be a number or 'random'"}
          />
        );
      }}
    />
  );
}
