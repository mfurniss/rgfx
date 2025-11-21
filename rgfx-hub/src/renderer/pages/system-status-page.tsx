import React from 'react';
import { Box, Paper } from '@mui/material';
import SystemStatus from '../components/system-status';
import { useDriverStore } from '../store/driver-store';
import DriverListTable from '../components/driver-list-table';

const SystemStatusPage: React.FC = () => {
  const systemStatus = useDriverStore((state) => state.systemStatus);
  const drivers = useDriverStore((state) => state.drivers);

  return (
    <Box>
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
