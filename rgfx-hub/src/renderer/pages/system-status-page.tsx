import React from 'react';
import { Box, Paper, Stack } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SystemStatus from '../components/system/system-status';
import { SystemErrors } from '../components/system/system-errors';
import { DriverFallbackNotification } from '../components/system/driver-fallback-notification';
import { OfflineNotification } from '../components/system/offline-notification';
import { EventsRateChart } from '../components/charts/events-rate-chart';
import { PageTitle } from '../components/layout/page-title';

const SystemStatusPage: React.FC = () => (
  <Box>
    <PageTitle icon={<DashboardIcon />} title="System Status" />
    <Stack spacing={3}>
      <OfflineNotification />
      <Paper>
        <SystemStatus />
      </Paper>
      <DriverFallbackNotification />
      <SystemErrors />
      <EventsRateChart />
    </Stack>
  </Box>
);

export default SystemStatusPage;
