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
          value={field.value ?? ''}
          label={label}
          size="small"
          fullWidth
          error={!!error}
          helperText={error}
          slotProps={{
            inputLabel: {
              shrink: field.value != null && field.value !== '',
            },
          }}
        />
      )}
    />
  );
}
