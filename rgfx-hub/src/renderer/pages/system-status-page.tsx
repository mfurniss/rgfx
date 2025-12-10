import React from 'react';
import { Box, Paper } from '@mui/material';
import { Dashboard as DashboardIcon } from '@mui/icons-material';
import SystemStatus from '../components/system-status';
import { useDriverStore } from '../store/driver-store';
import DriverListTable from '../components/driver-list-table';
import { PageTitle } from '../components/page-title';

const SystemStatusPage: React.FC = () => {
  const systemStatus = useDriverStore((state) => state.systemStatus);
  const drivers = useDriverStore((state) => state.drivers);

  return (
    <Box>
      <PageTitle icon={<DashboardIcon />} title="System Status" />
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
