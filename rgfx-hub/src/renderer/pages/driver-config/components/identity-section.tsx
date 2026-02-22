import React from 'react';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { Typography, TextField, Grid } from '@mui/material';
import type { ConfiguredDriverInput } from '@/schemas';

interface IdentitySectionProps {
  control: Control<ConfiguredDriverInput>;
  errors: FieldErrors<ConfiguredDriverInput>;
}

export const IdentitySection: React.FC<IdentitySectionProps> = ({ control, errors }) => (
  <>
    <Typography variant="h6" gutterBottom>
      Identity
    </Typography>
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Controller
          name="id"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Driver ID"
              fullWidth
              error={!!errors.id}
              helperText={errors.id?.message ?? 'Alphanumeric and hyphens only (1-32 chars)'}
            />
          )}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Controller
          name="macAddress"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="MAC Address"
              fullWidth
              disabled
              slotProps={{ input: { readOnly: true } }}
            />
          )}
        />
      </Grid>
    </Grid>
  </>
);
