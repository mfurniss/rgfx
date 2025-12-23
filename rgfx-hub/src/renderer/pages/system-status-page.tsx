import React from 'react';
import { Alert, Box, Paper } from '@mui/material';
import { Dashboard as DashboardIcon } from '@mui/icons-material';
import SystemStatus from '../components/system/system-status';
import { EventsRateChart } from '../components/charts/events-rate-chart';
import { useDriverStore } from '../store/driver-store';
import { PageTitle } from '../components/layout/page-title';

const SystemStatusPage: React.FC = () => {
  const systemStatus = useDriverStore((state) => state.systemStatus);
  const isOffline = systemStatus.hubIp === 'Unknown';

  return (
    <Box>
      <PageTitle icon={<DashboardIcon />} title="System Status" />
      {isOffline && (
        <Alert variant="outlined" severity="error" sx={{ mb: 2 }}>
          Network unavailable. Connect to the driver network to enable communication.
        </Alert>
      )}
      <Paper sx={{ mb: 3 }}>
        <SystemStatus status={systemStatus} />
      </Paper>
      <Paper sx={{ p: 2 }}>
        <EventsRateChart />
      </Paper>
    </Box>
  );
};

export default SystemStatusPage;
