/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
  CircularProgress,
  Alert,
  Grid,
  Tooltip,
} from '@mui/material';
import { Save as SaveIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { PageTitle } from '../components/page-title';
import { useDriverStore } from '../store/driver-store';
import { useNotificationStore } from '../store/notification-store';
import { NumberField } from '../components/number-field';
import SuperButton from '../components/super-button';
import {
  PersistedDriverSchema,
  type PersistedDriverFromSchema,
  type PersistedDriverInput,
} from '@/schemas';

// Extract display name from hardware ref (e.g., "led-hardware/foo.json" -> "foo")
const getHardwareDisplayName = (ref: string): string =>
  ref.replace(/^led-hardware\//, '').replace(/\.json$/, '');

export default function DriverConfigPage() {
  const { mac } = useParams<{ mac: string }>();
  const navigate = useNavigate();
  const addNotification = useNotificationStore((state) => state.addNotification);

  // Get driver from store by MAC address (immutable identifier)
  const driver = useDriverStore((state) => state.drivers.find((d) => d.mac === mac));

  // LED hardware options
  const [ledHardwareOptions, setLedHardwareOptions] = useState<string[]>([]);
  const [loadingHardware, setLoadingHardware] = useState(true);
  const [saving, setSaving] = useState(false);

  // Track which driver ID we've initialized the form for
  const initializedForDriverId = useRef<string | null>(null);

  // Load LED hardware options on mount
  useEffect(() => {
    void (async () => {
      try {
        const options = await window.rgfx.getLEDHardwareList();
        setLedHardwareOptions(options);
      } catch (error) {
        console.error('Failed to load LED hardware options:', error);
      } finally {
        setLoadingHardware(false);
      }
    })();
  }, []);

  // Form setup with Zod validation
  // Use PersistedDriverInput for form state (input type before defaults)
  // The zodResolver will produce PersistedDriverFromSchema (output type) on submit
  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm<PersistedDriverInput, unknown, PersistedDriverFromSchema>({
    resolver: zodResolver(PersistedDriverSchema),
    defaultValues: {
      id: driver?.id ?? '',
      macAddress: driver?.mac ?? '',
      description: driver?.description ?? '',
      remoteLogging: driver?.remoteLogging ?? 'errors',
      ledConfig: driver?.ledConfig ?? null,
    },
    mode: 'onChange',
  });

  const ledConfig = watch('ledConfig');

  // Reset form only on initial mount or when driver ID actually changes (e.g., after rename)
  // We don't want to reset on every driver update (heartbeats) as that would wipe user input
  useEffect(() => {
    if (driver && driver.id !== initializedForDriverId.current) {
      initializedForDriverId.current = driver.id;
      reset({
        id: driver.id,
        macAddress: driver.mac ?? '',
        description: driver.description ?? '',
        remoteLogging: driver.remoteLogging ?? 'errors',
        ledConfig: driver.ledConfig ?? null,
      });
    }
  }, [driver, reset]);

  if (!mac) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">Invalid driver MAC address</Typography>
      </Paper>
    );
  }

  if (!driver) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          Driver Not Found
        </Typography>
        <Typography color="text.secondary">No driver found with MAC: {mac}</Typography>
      </Paper>
    );
  }

  const onSubmit = async (data: PersistedDriverFromSchema) => {
    setSaving(true);

    try {
      await window.rgfx.saveDriverConfig(data);
      reset(data);
      addNotification({
        message: 'Configuration saved',
        severity: 'success',
        driverId: data.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      addNotification({
        message: `Failed to save configuration: ${message}`,
        severity: 'error',
        driverId: driver.id,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExit = () => {
    void navigate(`/driver/${mac}`);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    void handleSubmit(onSubmit)(e);
  };

  return (
    <Box>
      <PageTitle icon={<SettingsIcon />} title="Driver Configuration" subtitle={driver.id} />

      <Paper sx={{ p: 3, maxWidth: 900 }}>
        <form onSubmit={handleFormSubmit}>
          <Typography variant="h6" gutterBottom>
            Driver Identity
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

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Driver Settings
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

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            LED Configuration
          </Typography>

          {loadingHardware ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={20} />
              <Typography>Loading hardware options...</Typography>
            </Box>
          ) : ledHardwareOptions.length === 0 ? (
            <Alert severity="warning">
              No LED hardware definitions found. Add hardware files to ~/.rgfx/led-hardware/
            </Alert>
          ) : (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, md: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>LED Hardware</InputLabel>
                  <Select
                    value={ledConfig?.hardwareRef ?? ''}
                    label="LED Hardware"
                    onChange={(e) => {
                      const { value } = e.target;

                      if (value === '') {
                        setValue('ledConfig', null, { shouldDirty: true, shouldValidate: true });
                      } else {
                        setValue(
                          'ledConfig',
                          {
                            hardwareRef: value,
                            pin: ledConfig?.pin ?? 16,
                            offset: ledConfig?.offset,
                            globalBrightnessLimit: ledConfig?.globalBrightnessLimit,
                            dithering: ledConfig?.dithering,
                            powerSupplyVolts: ledConfig?.powerSupplyVolts,
                            maxPowerMilliamps: ledConfig?.maxPowerMilliamps,
                          },
                          { shouldDirty: true, shouldValidate: true },
                        );
                      }
                    }}
                  >
                    <MenuItem value="">None</MenuItem>
                    {ledHardwareOptions.map((hw) => (
                      <MenuItem key={hw} value={hw}>
                        {getHardwareDisplayName(hw)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              {ledConfig?.hardwareRef && (
                <>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <NumberField
                      name="ledConfig.pin"
                      control={control}
                      label="GPIO Pin"
                      helperText="ESP32 GPIO pin for LED data (0-39)"
                      min={0}
                      max={39}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <NumberField
                      name="ledConfig.offset"
                      control={control}
                      label="LED Offset"
                      helperText="Starting LED index offset (optional)"
                      min={0}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <NumberField
                      name="ledConfig.globalBrightnessLimit"
                      control={control}
                      label="Maximum Brightness"
                      helperText="Maximum brightness (0-255, optional)"
                      min={0}
                      max={255}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <NumberField
                      name="ledConfig.powerSupplyVolts"
                      control={control}
                      label="Power Supply Voltage"
                      helperText="Power supply voltage (1-24V, optional)"
                      min={1}
                      max={24}
                      allowFloat
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <NumberField
                      name="ledConfig.maxPowerMilliamps"
                      control={control}
                      label="Max Power (mA)"
                      helperText="Maximum power draw in milliamps (1-10000, optional)"
                      min={1}
                      max={10000}
                    />
                  </Grid>
                  <Grid size={{ xs: 12 }}>
                    <Controller
                      name="ledConfig.dithering"
                      control={control}
                      render={({ field }) => (
                        <Tooltip
                          title="Smooths color transitions at low brightness by rapidly alternating between nearby color values"
                          placement="right"
                        >
                          <FormControlLabel
                            control={<Checkbox {...field} checked={field.value ?? false} />}
                            label="Enable Temporal Dithering"
                          />
                        </Tooltip>
                      )}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          )}

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={handleExit} disabled={saving}>
              Exit
            </Button>
            <SuperButton
              type="submit"
              variant="contained"
              icon={<SaveIcon />}
              busy={saving}
              disabled={!isValid}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </SuperButton>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
