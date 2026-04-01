import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Link } from '@mui/material';
import { useSystemStatusStore } from '@/renderer/store/system-status-store';
import { PageBanner } from './page-banner';

const MIN_MAME_VERSION = '0.250';

export function MameVersionBanner() {
  const mameVersionChecked = useSystemStatusStore(
    (state) => state.systemStatus.mameVersionChecked,
  );
  const mameVersion = useSystemStatusStore(
    (state) => state.systemStatus.mameVersion,
  );

  if (!mameVersionChecked) {
    return null;
  }

  if (mameVersion && mameVersion >= MIN_MAME_VERSION) {
    return null;
  }

  return (
    <PageBanner color="warning">
      MAME {MIN_MAME_VERSION} or above not detected. Configure the
      MAME installation directory
      in&nbsp;<Link component={RouterLink} to="/settings">Settings</Link>.
    </PageBanner>
  );
}
