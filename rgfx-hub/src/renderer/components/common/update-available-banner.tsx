import React, { useState } from 'react';
import { Link } from '@mui/material';
import { useSystemStatusStore } from '@/renderer/store/system-status-store';
import { PageBanner } from './page-banner';

export function UpdateAvailableBanner() {
  const [dismissed, setDismissed] = useState(false);
  const updateAvailable = useSystemStatusStore(
    (state) => state.systemStatus.updateAvailable,
  );

  if (!updateAvailable || dismissed) {
    return null;
  }

  const handleClick = () => {
    void window.rgfx.openExternal(updateAvailable);
    setDismissed(true);
  };

  return (
    <PageBanner color="info">
      A new version of RGFX Hub is available.{' '}
      <Link component="button" variant="body2" onClick={handleClick}>
        View release
      </Link>
    </PageBanner>
  );
}
