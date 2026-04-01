import React, { useState } from 'react';
import { Alert } from '@mui/material';
import { useSystemStatusStore } from '@/renderer/store/system-status-store';

export const DriverFallbackNotification: React.FC = () => {
  const active = useSystemStatusStore((state) => state.systemStatus.driverFallbackActive);
  const [dismissed, setDismissed] = useState(false);

  if (!active || dismissed) {
    return null;
  }

  return (
    <Alert
      variant="outlined"
      severity="warning"
      sx={{ '& .MuiAlert-message': { textWrap: 'balance' } }}
      onClose={setDismissed.bind(null, true)}
    >
      Effects are being routed to a{' '}
      <a target="blank" href="https://rgfx.io/docs/hub-app/settings.html?h=fallback#driver-fallback">
        fallback driver
      </a>{' '}
      because one or more targeted drivers are offline or unconfigured.
    </Alert>
  );
};
