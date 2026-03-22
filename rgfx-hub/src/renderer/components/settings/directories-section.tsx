import React, { useRef, useState } from 'react';
import { Stack } from '@mui/material';
import Save from '@mui/icons-material/Save';
import { useUiStore } from '../../store/ui-store';
import { useAppInfoStore } from '../../store/app-info-store';
import { useSystemStatusStore } from '../../store/system-status-store';
import { notify } from '../../store/notification-store';
import SuperButton from '../common/super-button';
import { SettingsSection } from './settings-section';
import { DirectoryField, DirectoryFieldHandle } from './directory-field';

export function DirectoriesSection() {
  const storedConfigDir = useUiStore((s) => s.rgfxConfigDirectory);
  const storedMameDir = useUiStore((s) => s.mameDirectory);
  const storedRomsDir = useUiStore((s) => s.mameRomsDirectory);
  const setRgfxConfigDirectory = useUiStore((s) => s.setRgfxConfigDirectory);
  const setMameDirectory = useUiStore((s) => s.setMameDirectory);
  const setMameRomsDirectory = useUiStore((s) => s.setMameRomsDirectory);
  const appInfo = useAppInfoStore((s) => s.appInfo);
  const defaultConfigDir = appInfo?.defaultRgfxConfigDir ?? '';
  const detectedMamePath = useSystemStatusStore(
    (s) => s.systemStatus.detectedMamePath,
  );

  const configRef = useRef<DirectoryFieldHandle>(null);
  const mameRef = useRef<DirectoryFieldHandle>(null);
  const romsRef = useRef<DirectoryFieldHandle>(null);
  const [isSaving, setIsSaving] = useState(false);

  const refs = [configRef, mameRef, romsRef];

  const handleSave = () => {
    void (async () => {
      setIsSaving(true);

      const handles = refs.map((r) => r.current);

      if (handles.some((h) => !h)) {
        setIsSaving(false);
        return;
      }

      const results = await Promise.all(
        handles.map((h) => h?.validate() ?? Promise.resolve(false)),
      );

      if (results.every(Boolean)) {
        const configDir = configRef.current?.getValue() ?? '';
        const mameDir = mameRef.current?.getValue() ?? '';
        const romsDir = romsRef.current?.getValue() ?? '';

        setRgfxConfigDirectory(configDir);
        setMameDirectory(mameDir);
        setMameRomsDirectory(romsDir);

        const mameResult = await window.rgfx.updateMameDirectory(mameDir);

        if (romsDir) {
          await window.rgfx.updateMameRomsDirectory(romsDir);
        }

        if (mameResult.mameVersion) {
          notify(`Settings saved — MAME ${mameResult.mameVersion} detected`, 'success');
        } else {
          notify('Settings saved', 'success');
        }
      } else {
        notify('Settings not saved, fix error(s)', 'error');
      }

      setIsSaving(false);
    })();
  };

  return (
    <SettingsSection title="Directories">
      <DirectoryField
        ref={configRef}
        label="Directory for config and logs"
        dialogTitle="Select RGFX Config Directory"
        helperText="Directory for RGFX configuration and log files"
        storedValue={storedConfigDir || defaultConfigDir}
        defaultPath={defaultConfigDir}
        required
      />
      <DirectoryField
        ref={mameRef}
        label="MAME Installation Directory"
        dialogTitle="Select MAME Installation Directory"
        helperText={detectedMamePath
          ?? 'Directory containing the MAME executable (optional, auto-detected if empty)'}
        storedValue={storedMameDir}
      />
      <DirectoryField
        ref={romsRef}
        label="MAME ROMs Directory"
        dialogTitle="Select MAME ROMs Directory"
        helperText="Directory containing MAME ROM files (optional)"
        storedValue={storedRomsDir}
      />
      <Stack direction="row" justifyContent="flex-end">
        <SuperButton
          variant="contained"
          icon={<Save />}
          onClick={handleSave}
          busy={isSaving}
        >
          Save
        </SuperButton>
      </Stack>
    </SettingsSection>
  );
}
