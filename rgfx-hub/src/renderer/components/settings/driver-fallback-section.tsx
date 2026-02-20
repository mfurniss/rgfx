import React from 'react';
import { FormControlLabel, Switch, Typography } from '@mui/material';
import { useUiStore } from '../../store/ui-store';
import { SettingsSection } from './settings-section';

export function DriverFallbackSection() {
  const enabled = useUiStore(
    (state) => state.driverFallbackEnabled,
  );
  const setEnabled = useUiStore(
    (state) => state.setDriverFallbackEnabled,
  );

  const handleToggle = (
    _event: React.ChangeEvent<HTMLInputElement>,
    checked: boolean,
  ) => {
    setEnabled(checked);
    void window.rgfx.setDriverFallbackEnabled(checked);
  };

  return (
    <SettingsSection
      title="Driver Fallback"
      subtitle="Route effects to first available driver when targets are undefined or offline"
    >
      <FormControlLabel
        control={
          <Switch
            checked={enabled}
            onChange={handleToggle}
            aria-label="Enable driver fallback"
          />
        }
        label="Enable driver fallback"
      />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 1 }}
      >
        When enabled, effects targeting offline or non-existent drivers
        will be sent to the first available online driver instead of
        being dropped. Useful when you have fewer drivers than your
        transformer configuration expects.
      </Typography>
    </SettingsSection>
  );
}
