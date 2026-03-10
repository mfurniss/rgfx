import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import Brightness4 from '@mui/icons-material/Brightness4';
import Brightness7 from '@mui/icons-material/Brightness7';
import SettingsBrightness from '@mui/icons-material/SettingsBrightness';
import { useColorScheme } from '@mui/material/styles';
import { SettingsSection } from './settings-section';

type ThemeMode = 'system' | 'light' | 'dark';

export function AppearanceSection() {
  const { mode, setMode } = useColorScheme();

  const handleModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: ThemeMode | null) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  };

  return (
    <SettingsSection
      title="Appearance"
      subtitle="Choose your preferred theme mode"
      sx={{ mb: 3 }}
    >
      <ToggleButtonGroup
        value={mode}
        exclusive
        onChange={handleModeChange}
        aria-label="theme mode"
      >
        <ToggleButton value="system" aria-label="system theme">
          <SettingsBrightness sx={{ mr: 1 }} />
          System
        </ToggleButton>
        <ToggleButton value="light" aria-label="light theme">
          <Brightness7 sx={{ mr: 1 }} />
          Light
        </ToggleButton>
        <ToggleButton value="dark" aria-label="dark theme">
          <Brightness4 sx={{ mr: 1 }} />
          Dark
        </ToggleButton>
      </ToggleButtonGroup>
    </SettingsSection>
  );
}
