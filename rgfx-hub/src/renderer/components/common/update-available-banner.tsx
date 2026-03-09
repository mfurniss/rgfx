import React, { useState } from 'react';
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
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          handleClick();
        }}
      >
        View release
      </a>
    </PageBanner>
  );
}
