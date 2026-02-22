import React from 'react';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import {
  Typography,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import type { ConfiguredDriverInput } from '@/schemas';

interface SettingsSectionProps {
  control: Control<ConfiguredDriverInput>;
  errors: FieldErrors<ConfiguredDriverInput>;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ control, errors }) => (
  <>
    <Typography variant="h6" gutterBottom>
      Settings
    </Typography>
    <Grid container spacing={2} sx={{ mb: 3 }}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value ?? ''}
              label="Description"
              fullWidth
              placeholder="Optional description for this driver"
              error={!!errors.description}
              helperText={errors.description?.message}
            />
          )}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Controller
          name="remoteLogging"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.remoteLogging}>
              <InputLabel>Remote Logging</InputLabel>
              <Select {...field} value={field.value ?? 'off'} label="Remote Logging">
                <MenuItem value="off">Off</MenuItem>
                <MenuItem value="errors">Errors Only</MenuItem>
                <MenuItem value="all">All Logs</MenuItem>
              </Select>
            </FormControl>
          )}
        />
      </Grid>
    </Grid>
  </>
);
