import React from 'react';
import { Paper, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Brightness4, Brightness7, SettingsBrightness } from '@mui/icons-material';
import { useColorScheme } from '@mui/material/styles';

type ThemeMode = 'system' | 'light' | 'dark';

export function AppearanceSection() {
  const { mode, setMode } = useColorScheme();

  const handleModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: ThemeMode | null) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom>
        Appearance
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Choose your preferred theme mode
      </Typography>
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
    </Paper>
  );
}
