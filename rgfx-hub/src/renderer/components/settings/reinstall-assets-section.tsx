import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  Typography,
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SuperButton from '../common/super-button';
import { DialogTitleWithIcon } from '../common/dialog-title-with-icon';
import { notify } from '../../store/notification-store';
import { SettingsSection } from './settings-section';

export function ReinstallAssetsSection() {
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const openConfirm = () => {
    setConfirmOpen(true);
  };

  const closeConfirm = () => {
    setConfirmOpen(false);
  };

  const handleConfirm = () => {
    setConfirmOpen(false);
    setBusy(true);

    void (async () => {
      try {
        const result = await window.rgfx.reinstallAssets();

        if (result.error) {
          notify(`Reinstall failed: ${result.error}`, 'error');
        } else if (result.success) {
          notify(
            'Default assets reinstalled successfully',
            'success',
          );
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unknown error';
        notify(`Reinstall failed: ${message}`, 'error');
      } finally {
        setBusy(false);
      }
    })();
  };

  return (
    <SettingsSection
      title="Default Assets"
      subtitle="Reinstall bundled default assets"
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2 }}
      >
        Overwrites interceptors, transformers, LED hardware
        configs, and launch script in ~/.rgfx with the bundled
        defaults. Any customizations will be replaced.
      </Typography>
      <Stack direction="row" justifyContent="flex-end">
        <SuperButton
          variant="outlined"
          icon={<RestoreIcon />}
          onClick={openConfirm}
          busy={busy}
        >
          Reinstall Default Assets
        </SuperButton>
      </Stack>

      <Dialog
        open={confirmOpen}
        onClose={closeConfirm}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitleWithIcon
          icon={<WarningAmberIcon />}
          title="Reinstall Default Assets"
          iconColor="warning"
        />
        <DialogContent>
          <Typography>
            This will overwrite your customized interceptors,
            transformers, LED hardware configs, and launch script
            with the bundled defaults.
          </Typography>
          <Typography sx={{ mt: 2, fontWeight: 'bold' }}>
            Any changes you have made will be lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={closeConfirm}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color="warning"
          >
            Reinstall
          </Button>
        </DialogActions>
      </Dialog>
    </SettingsSection>
  );
}
