import React, { useState } from 'react';
import { Stack, Typography } from '@mui/material';
import ArchiveIcon from '@mui/icons-material/Archive';
import SuperButton from '../common/super-button';
import { notify } from '../../store/notification-store';
import { SettingsSection } from './settings-section';

export function BackupSection() {
  const [busy, setBusy] = useState(false);

  const handleBackup = () => {
    setBusy(true);

    void (async () => {
      try {
        const result = await window.rgfx.createBackup();

        if (result.error) {
          notify(`Backup failed: ${result.error}`, 'error');
        } else if (result.success) {
          notify('Backup saved successfully', 'success');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        notify(`Backup failed: ${message}`, 'error');
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <SettingsSection
      title="Backup"
      subtitle="Save a copy of your RGFX configuration directory"
    >
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Creates a zip archive of all configuration files, interceptors, transformers,
        LED hardware definitions, and logs.
      </Typography>
      <Stack direction="row" justifyContent="flex-end">
        <SuperButton
          variant="outlined"
          icon={<ArchiveIcon />}
          onClick={handleBackup}
          busy={busy}
        >
          Create Backup
        </SuperButton>
      </Stack>
    </SettingsSection>
  );
}
