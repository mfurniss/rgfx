import React from 'react';
import { Alert, Box, Paper } from '@mui/material';
import { Dashboard as DashboardIcon } from '@mui/icons-material';
import SystemStatus from '../components/system-status';
import { useDriverStore } from '../store/driver-store';
import DriverListTable from '../components/driver-list-table';
import { PageTitle } from '../components/page-title';

const SystemStatusPage: React.FC = () => {
  const systemStatus = useDriverStore((state) => state.systemStatus);
  const drivers = useDriverStore((state) => state.drivers);
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
      <Paper sx={{ mb: 3 }}>
        <DriverListTable drivers={drivers} />
      </Paper>
    </Box>
  );
};

export default SystemStatusPage;
