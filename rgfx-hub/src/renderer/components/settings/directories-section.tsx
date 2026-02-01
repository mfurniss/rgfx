import React, { useEffect, useState } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Stack,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Save, FolderOpen } from '@mui/icons-material';
import { useUiStore } from '../../store/ui-store';
import { useAppInfoStore } from '../../store/app-info-store';
import { notify } from '../../store/notification-store';

export function DirectoriesSection() {
  const storedRgfxConfigDirectory = useUiStore((state) => state.rgfxConfigDirectory);
  const storedMameRomsDirectory = useUiStore((state) => state.mameRomsDirectory);
  const setRgfxConfigDirectory = useUiStore((state) => state.setRgfxConfigDirectory);
  const setMameRomsDirectory = useUiStore((state) => state.setMameRomsDirectory);
  const appInfo = useAppInfoStore((state) => state.appInfo);

  const defaultConfigDir = appInfo?.defaultRgfxConfigDir ?? '';
  const [configDir, setConfigDir] = useState(storedRgfxConfigDirectory || defaultConfigDir);
  const [romsDir, setRomsDir] = useState(storedMameRomsDirectory);
  const [configDirError, setConfigDirError] = useState<string | null>(null);
  const [romsDirError, setRomsDirError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setConfigDir(storedRgfxConfigDirectory || defaultConfigDir);
  }, [storedRgfxConfigDirectory, defaultConfigDir]);

  useEffect(() => {
    setRomsDir(storedMameRomsDirectory);
  }, [storedMameRomsDirectory]);

  const handleSave = () => {
    void (async () => {
      setIsSaving(true);
      let isValid = true;

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
    <Paper sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Directories
      </Typography>
      <TextField
        label="Directory for config and logs"
        value={configDir}
        onChange={(e) => {
          setConfigDir(e.target.value);

          if (configDirError) {
            setConfigDirError(null);
          }
        }}
        placeholder={defaultConfigDir}
        fullWidth
        required
        error={!!configDirError}
        helperText={configDirError ?? 'Directory for RGFX configuration and log files'}
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
  );
}
