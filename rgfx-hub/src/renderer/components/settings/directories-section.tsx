import React, { useEffect, useRef, useState } from 'react';
import { Stack } from '@mui/material';
import Save from '@mui/icons-material/Save';
import { useUiStore } from '../../store/ui-store';
import { useAppInfoStore } from '../../store/app-info-store';
import { notify } from '../../store/notification-store';
import { DirectoryPicker } from '../common/directory-picker';
import SuperButton from '../common/super-button';
import { SettingsSection } from './settings-section';

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

  // Track initialization to prevent infinite loops on Windows
  const configDirInitialized = useRef(false);
  const romsDirInitialized = useRef(false);

  // Initialize config dir from store once (async appInfo may load after mount)
  useEffect(() => {
    const newValue = storedRgfxConfigDirectory || defaultConfigDir;

    if (!configDirInitialized.current && newValue) {
      configDirInitialized.current = true;
      setConfigDir(newValue);
    }
  }, [storedRgfxConfigDirectory, defaultConfigDir]);

  // Initialize roms dir from store once
  useEffect(() => {
    if (!romsDirInitialized.current && storedMameRomsDirectory) {
      romsDirInitialized.current = true;
      setRomsDir(storedMameRomsDirectory);
    }
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

  return (
    <SettingsSection title="Directories">
      <DirectoryPicker
        label="Directory for config and logs"
        value={configDir}
        onChange={(value) => {
          setConfigDir(value);

          if (configDirError) {
            setConfigDirError(null);
          }
        }}
        dialogTitle="Select RGFX Config Directory"
        defaultPath={defaultConfigDir}
        error={configDirError ?? undefined}
        helperText="Directory for RGFX configuration and log files"
        sx={{ mb: 3 }}
      />
      <DirectoryPicker
        label="MAME ROMs Directory"
        value={romsDir}
        onChange={(value) => {
          setRomsDir(value);

          if (romsDirError) {
            setRomsDirError(null);
          }
        }}
        dialogTitle="Select MAME ROMs Directory"
        error={romsDirError ?? undefined}
        helperText="Directory containing MAME ROM files (optional)"
        sx={{ mb: 3 }}
      />
      <Stack direction="row" justifyContent="flex-end">
        <SuperButton variant="contained" icon={<Save />} onClick={handleSave} busy={isSaving}>
          Save
        </SuperButton>
      </Stack>
    </SettingsSection>
  );
}
