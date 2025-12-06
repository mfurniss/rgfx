/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { FormControlLabel, Switch } from '@mui/material';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

interface BooleanFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
}

export function BooleanField<T extends FieldValues>({
  name,
  control,
  label,
}: BooleanFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormControlLabel
          control={
            <Switch
              checked={field.value ?? false}
              onChange={(e) => {
                field.onChange(e.target.checked);
              }}
            />
          }
          label={label}
          labelPlacement="start"
          sx={{ ml: 0 }}
        />
      )}
    />
  );
}
