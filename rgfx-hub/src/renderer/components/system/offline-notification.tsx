import React from 'react';
import { Alert } from '@mui/material';
import { useSystemStatusStore } from '@/renderer/store/system-status-store';

export const OfflineNotification: React.FC = () => {
  const isOffline = useSystemStatusStore((state) => state.systemStatus.hubIp === 'Unknown');

  if (!isOffline) {
    return null;
  }

  return (
    <Alert variant="outlined" severity="error">
      Network unavailable. Connect to the driver network to enable communication.
    </Alert>
  );
};
