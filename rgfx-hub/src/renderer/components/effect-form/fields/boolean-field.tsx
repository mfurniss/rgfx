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
