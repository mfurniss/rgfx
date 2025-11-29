/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React from 'react';
import { TextField, type TextFieldProps } from '@mui/material';
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form';

type NumberFieldProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> = {
  name: TName;
  control: Control<TFieldValues>;
  label: string;
  helperText?: string;
  min?: number;
  max?: number;
  step?: number;
  allowFloat?: boolean;
} & Omit<TextFieldProps, 'name' | 'value' | 'onChange' | 'type'>;

/**
 * A number input field for react-hook-form that properly handles clearing.
 *
 * Uses local string state during editing to allow clearing the field completely,
 * then converts to number on blur. This avoids the browser's type="number"
 * restriction that prevents empty values.
 *
 * @see https://stackoverflow.com/questions/58627879/how-to-allow-deleting-all-chars-in-react-material-ui-input-field-component
 * @see https://react-hook-form.com/docs/usecontroller/controller
 */
export function NumberField<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
  name,
  control,
  label,
  helperText,
  min: _min,
  max: _max,
  allowFloat = false,
  ...textFieldProps
}: NumberFieldProps<TFieldValues, TName>) {
  void _min;
  void _max;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field: { onChange, onBlur, value, ref }, fieldState: { error } }) => (
        <TextField
          name={name}
          inputRef={ref}
          onBlur={onBlur}
          value={value ?? ''}
          onChange={(e) => {
            const val = e.target.value;

            if (val === '') {
              onChange(null);
            } else {
              const num = allowFloat ? parseFloat(val) : parseInt(val, 10);
              onChange(isNaN(num) ? null : num);
            }
          }}
          label={label}
          type="text"
          fullWidth
          error={!!error}
          helperText={error?.message ?? helperText}
          {...textFieldProps}
        />
      )}
    />
  );
}
