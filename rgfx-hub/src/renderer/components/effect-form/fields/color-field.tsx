import React from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { ColorPicker } from './color-picker';

interface ColorFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  namedColors: readonly string[];
  error?: string;
  disabled?: boolean;
}

export function ColorField<T extends FieldValues>({
  name,
  control,
  label,
  error,
  disabled,
}: ColorFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <ColorPicker
          label={label}
          value={field.value ?? ''}
          onChange={field.onChange}
          disabled={disabled}
          helperText={error ?? "Named color (e.g. 'red', 'random') or hex (#RRGGBB)"}
        />
      )}
    />
  );
}
