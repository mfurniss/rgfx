import React from 'react';
import { Alert, Box, Paper, Stack } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SystemStatus from '../components/system/system-status';
import { SystemErrors } from '../components/system/system-errors';
import { EventsRateChart } from '../components/charts/events-rate-chart';
import { useSystemStatusStore } from '../store/system-status-store';
import { PageTitle } from '../components/layout/page-title';

const SystemStatusPage: React.FC = () => {
  const systemStatus = useSystemStatusStore((state) => state.systemStatus);
  const isOffline = systemStatus.hubIp === 'Unknown';

  return (
    <Box>
      <PageTitle icon={<DashboardIcon />} title="System Status" />
      <Stack spacing={3}>
        {isOffline && (
          <Alert variant="outlined" severity="error">
            Network unavailable. Connect to the driver network to enable communication.
          </Alert>
        )}
        <Paper>
          <SystemStatus status={systemStatus} />
        </Paper>
        <SystemErrors errors={systemStatus.systemErrors} />
        <EventsRateChart />
      </Stack>
    </Box>
  );
};

export default SystemStatusPage;
