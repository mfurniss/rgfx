import React from 'react';
import { Box, Paper } from '@mui/material';
import { Usb as UsbIcon } from '@mui/icons-material';
import { useDriverStore } from '../store/driver-store';
import DriverListTable from '../components/driver/driver-list-table';
import { PageTitle } from '../components/layout/page-title';

const DriversPage: React.FC = () => {
  const drivers = useDriverStore((state) => state.drivers);

  return (
    <Box>
      <PageTitle icon={<UsbIcon />} title="Drivers" />
      <Paper sx={{ mb: 3 }}>
        <DriverListTable drivers={drivers} />
      </Paper>
    </Box>
  );
};

export default DriversPage;
