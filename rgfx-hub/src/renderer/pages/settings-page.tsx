import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Stack,
  IconButton,
  InputAdornment,
  Slider,
} from '@mui/material';
import {
  Brightness4,
  Brightness7,
  SettingsBrightness,
  Save,
  FolderOpen,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { PageTitle } from '../components/layout/page-title';
import { useColorScheme } from '@mui/material/styles';
import { useUiStore } from '../store/ui-store';
import { useAppInfoStore } from '../store/app-info-store';
import { notify } from '../store/notification-store';

type ThemeMode = 'system' | 'light' | 'dark';

const SettingsPage: React.FC = () => {
  const { mode, setMode } = useColorScheme();
  const storedRgfxConfigDirectory = useUiStore((state) => state.rgfxConfigDirectory);
  const storedMameRomsDirectory = useUiStore((state) => state.mameRomsDirectory);
  const setRgfxConfigDirectory = useUiStore((state) => state.setRgfxConfigDirectory);
  const setMameRomsDirectory = useUiStore((state) => state.setMameRomsDirectory);
  const stripLifespanScale = useUiStore((state) => state.stripLifespanScale);
  const setStripLifespanScale = useUiStore((state) => state.setStripLifespanScale);
  const appInfo = useAppInfoStore((state) => state.appInfo);

  // Local form state - use static defaults from app info
  const defaultConfigDir = appInfo?.defaultRgfxConfigDir ?? '';
  const [configDir, setConfigDir] = useState(storedRgfxConfigDirectory || defaultConfigDir);
  const [romsDir, setRomsDir] = useState(storedMameRomsDirectory);
  const [configDirError, setConfigDirError] = useState<string | null>(null);
  const [romsDirError, setRomsDirError] = useState<string | null>(null);

  // Sync local state when store changes
  useEffect(() => {
    setConfigDir(storedRgfxConfigDirectory || defaultConfigDir);
  }, [storedRgfxConfigDirectory, defaultConfigDir]);

  useEffect(() => {
    setRomsDir(storedMameRomsDirectory);
  }, [storedMameRomsDirectory]);

  const handleModeChange = (_event: React.MouseEvent<HTMLElement>, newMode: ThemeMode | null) => {
    if (newMode !== null) {
      setMode(newMode);
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    void (async () => {
      setIsSaving(true);
      let isValid = true;

      // Config directory is required and must exist
      if (!configDir.trim()) {
        setConfigDirError('RGFX Config Directory is required');
        isValid = false;
      } else {
        const configExists = await window.rgfx.verifyDirectory(configDir.trim());

        if (!configExists) {
          setConfigDirError('Directory does not exist');
          isValid = false;
        } else {
          setConfigDirError(null);
        }
      }

      // ROMs directory is optional but must exist if provided
      if (romsDir.trim()) {
        const romsExists = await window.rgfx.verifyDirectory(romsDir.trim());

        if (!romsExists) {
          setRomsDirError('Directory does not exist');
          isValid = false;
        } else {
          setRomsDirError(null);
        }
      } else {
        setRomsDirError(null);
      }

      if (isValid) {
        setRgfxConfigDirectory(configDir.trim());
        setMameRomsDirectory(romsDir.trim());
        notify('Settings saved', 'success');
      } else {
        notify('Settings not saved, fix error(s)', 'error');
      }

      setIsSaving(false);
    })();
  };

  const handleSelectConfigDir = () => {
    void (async () => {
      const selected = await window.rgfx.selectDirectory(
        'Select RGFX Config Directory',
        configDir || defaultConfigDir,
      );

      if (selected) {
        setConfigDir(selected);

        if (configDirError) {
          setConfigDirError(null);
        }
      }
    })();
  };

  const handleSelectRomsDir = () => {
    void (async () => {
      const selected = await window.rgfx.selectDirectory(
        'Select MAME ROMs Directory',
        romsDir || undefined,
      );

      if (selected) {
        setRomsDir(selected);

        if (romsDirError) {
          setRomsDirError(null);
        }
      }
    })();
  };

  return (
    <Box>
      <PageTitle icon={<SettingsIcon />} title="Settings" />

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

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Directories
        </Typography>
        <TextField
          label="RGFX Config Directory"
          value={configDir}
          onChange={(e) => {
            setConfigDir(e.target.value);

            if (configDirError) {
              setConfigDirError(null);
            }
          }}
          placeholder={defaultConfigDir || '~/.rgfx'}
          fullWidth
          required
          error={!!configDirError}
          helperText={configDirError ?? 'Directory for RGFX configuration files (interceptors, transformers)'}
          sx={{ mb: 3 }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleSelectConfigDir}
                    edge="end"
                    aria-label="Select config directory"
                  >
                    <FolderOpen />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <TextField
          label="MAME ROMs Directory"
          value={romsDir}
          onChange={(e) => {
            setRomsDir(e.target.value);

            if (romsDirError) {
              setRomsDirError(null);
            }
          }}
          placeholder="Enter path to MAME ROMs"
          fullWidth
          error={!!romsDirError}
          helperText={romsDirError ?? 'Directory containing MAME ROM files (optional)'}
          sx={{ mb: 3 }}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleSelectRomsDir}
                    edge="end"
                    aria-label="Select ROMs directory"
                  >
                    <FolderOpen />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        <Stack direction="row" justifyContent="flex-end">
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </Stack>
      </Paper>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Effect Modifiers
        </Typography>
        <Box sx={{ px: 1 }}>
          <Typography variant="body2" gutterBottom>
            Strip Explosions: {stripLifespanScale.toFixed(2)}
          </Typography>
          <Slider
            value={stripLifespanScale}
            onChange={(_e, value) => {
              if (typeof value === 'number') {
                setStripLifespanScale(value);
              }
            }}
            min={0.1}
            max={1.0}
            step={0.05}
            marks={[
              { value: 0.1, label: '0.1' },
              { value: 0.6, label: '0.6' },
              { value: 1.0, label: '1.0' },
            ]}
            valueLabelDisplay="auto"
            aria-label="Strip lifespan scale"
          />
        </Box>
      </Paper>
    </Box>
  );
};

export default SettingsPage;
