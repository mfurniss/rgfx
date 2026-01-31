/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Copyright (c) 2025 Matt Furniss <furniss@gmail.com>
 */

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Paper, Typography, Button } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { PageTitle } from '../components/layout/page-title';
import { useDriverStore } from '../store/driver-store';
import { notify } from '../store/notification-store';
import SuperButton from '../components/common/super-button';
import {
  ConfiguredDriverSchema,
  type ConfiguredDriverFromSchema,
  type ConfiguredDriverInput,
} from '@/schemas';
import type { LEDHardware } from '@/types';
import {
  IdentitySection,
  SettingsSection,
  LedConfigSection,
  useLedHardware,
  normalizeLedConfig,
} from './driver-config';

export default function DriverConfigPage() {
  const { mac } = useParams<{ mac: string }>();
  const navigate = useNavigate();

  // Get driver from store by MAC address (immutable identifier)
  const driver = useDriverStore((state) => state.drivers.find((d) => d.mac === mac));

  // LED hardware options from custom hook
  const { options: ledHardwareOptions, loading: loadingHardware } = useLedHardware();

  // Selected hardware details (fetched when hardwareRef changes)
  const [selectedHardware, setSelectedHardware] = useState<LEDHardware | null>(null);
  const [saving, setSaving] = useState(false);

  // Determine if selected hardware is a strip (for conditional UI)
  const isStrip = selectedHardware?.layout === 'strip';

  // Track which driver ID we've initialized the form for
  const initializedForDriverId = useRef<string | null>(null);

  // Form setup with Zod validation
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ConfiguredDriverInput, unknown, ConfiguredDriverFromSchema>({
    resolver: zodResolver(ConfiguredDriverSchema),
    defaultValues: {
      id: driver?.id ?? '',
      macAddress: driver?.mac ?? '',
      description: driver?.description ?? '',
      remoteLogging: driver?.remoteLogging ?? 'errors',
      ledConfig: normalizeLedConfig(driver?.ledConfig),
    },
    mode: 'onChange',
  });

  const ledConfig = watch('ledConfig');

  // Fetch hardware details when hardwareRef changes
  useEffect(() => {
    if (ledConfig?.hardwareRef) {
      void (async () => {
        try {
          const hardware = await window.rgfx.getLEDHardware(ledConfig.hardwareRef);
          setSelectedHardware(hardware);
        } catch (error) {
          console.error('Failed to load hardware details:', error);
          setSelectedHardware(null);
        }
      })();
    } else {
      setSelectedHardware(null);
    }
  }, [ledConfig?.hardwareRef]);

  // Reset form only on initial mount or when driver ID actually changes
  useEffect(() => {
    if (driver && driver.id !== initializedForDriverId.current) {
      initializedForDriverId.current = driver.id;
      reset({
        id: driver.id,
        macAddress: driver.mac ?? '',
        description: driver.description ?? '',
        remoteLogging: driver.remoteLogging ?? 'errors',
        ledConfig: normalizeLedConfig(driver.ledConfig),
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

  const onSubmit = async (data: ConfiguredDriverFromSchema) => {
    setSaving(true);

    try {
      await window.rgfx.saveDriverConfig(data);
      reset(data);
      notify(`${data.id} configuration saved`, 'info');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      notify(`${data.id} failed to save: ${message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExit = () => {
    void navigate(`/drivers/${mac}`);
  };

  const handleFormSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    void handleSubmit(onSubmit)(e);
  };

  return (
    <Box>
      <PageTitle
        title="Driver Configuration"
        subtitle={driver.id}
        backPath={`/drivers/${mac}`}
        backLabel="Back to Driver"
      />

      <Paper sx={{ p: 3, maxWidth: 900 }}>
        <form onSubmit={handleFormSubmit}>
          <IdentitySection control={control} errors={errors} />

          <SettingsSection control={control} errors={errors} />

          <LedConfigSection
            control={control}
            watch={watch}
            setValue={setValue}
            ledHardwareOptions={ledHardwareOptions}
            selectedHardware={selectedHardware}
            loadingHardware={loadingHardware}
            isStrip={isStrip}
            chipModel={driver.telemetry?.chipModel}
          />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={handleExit} disabled={saving}>
              Exit
            </Button>
            <SuperButton
              type="submit"
              variant="contained"
              icon={<SaveIcon />}
              busy={saving}
              disabled={Object.keys(errors).length > 0}
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </SuperButton>
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
