/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React, { useState, useEffect } from 'react';
import { TextField, type TextFieldProps } from '@mui/material';
import {
  Controller,
  type Control,
  type ControllerRenderProps,
  type FieldPath,
  type FieldValues,
} from 'react-hook-form';

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

interface NumberInputProps {
  name: string;
  field: ControllerRenderProps<FieldValues, string>;
  label: string;
  helperText?: string;
  allowFloat: boolean;
  error?: string;
  textFieldProps: Omit<TextFieldProps, 'name' | 'value' | 'onChange' | 'type'>;
}

function NumberInput({
  name,
  field,
  label,
  helperText,
  allowFloat,
  error,
  textFieldProps,
}: NumberInputProps) {
  const { onChange, onBlur, value, ref } = field as {
    onChange: (val: number | undefined) => void;
    onBlur: () => void;
    value: number | null | undefined;
    ref: React.Ref<HTMLInputElement>;
  };

  // Local state for the text input value during editing
  const [localValue, setLocalValue] = useState(() =>
    value == null ? '' : String(value),
  );

  // Sync from form to local when form value changes externally
  useEffect(() => {
    const formStr = value == null ? '' : String(value);
    setLocalValue(formStr);
  }, [value]);

  const handleBlur = () => {
    // Convert to number and sync to form on blur
    if (localValue === '') {
      onChange(undefined);
    } else {
      const num = allowFloat ? parseFloat(localValue) : parseInt(localValue, 10);
      onChange(isNaN(num) ? undefined : num);
    }
    onBlur();
  };

  return (
    <TextField
      name={name}
      inputRef={ref}
      onBlur={handleBlur}
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
      }}
      label={label}
      type="number"
      fullWidth
      error={!!error}
      helperText={error ?? helperText}
      {...textFieldProps}
    />
  );
}

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
export function NumberField<
  TFieldValues extends FieldValues,
  TName extends FieldPath<TFieldValues>,
>({
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
      render={({ field, fieldState: { error } }) => (
        <NumberInput
          name={name}
          field={field}
          label={label}
          helperText={helperText}
          allowFloat={allowFloat}
          error={error?.message}
          textFieldProps={textFieldProps}
        />
      )}
    />
  );
}
