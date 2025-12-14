/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { TextField } from '@mui/material';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

interface StringFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  error?: string;
}

export function StringField<T extends FieldValues>({
  name,
  control,
  label,
  error,
}: StringFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          label={label}
          size="small"
          fullWidth
          error={!!error}
          helperText={error}
        />
      )}
    />
  );
}
