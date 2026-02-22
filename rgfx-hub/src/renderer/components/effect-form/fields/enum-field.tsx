import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, FormHelperText } from '@mui/material';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';

interface EnumFieldProps<T extends FieldValues> {
  name: Path<T>;
  control: Control<T>;
  label: string;
  options: readonly string[];
  error?: string;
}

export function EnumField<T extends FieldValues>({
  name,
  control,
  label,
  options,
  error,
}: EnumFieldProps<T>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormControl fullWidth error={!!error} size="small">
          <InputLabel>{label}</InputLabel>
          <Select
            {...field}
            value={field.value ?? ''}
            label={label}
          >
            {options.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
          {error && <FormHelperText>{error}</FormHelperText>}
        </FormControl>
      )}
    />
  );
}
