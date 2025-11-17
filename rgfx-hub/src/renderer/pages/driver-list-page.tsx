import React from 'react';
import { Typography, Box } from '@mui/material';
import DriverListTable from '../components/driver-list-table';
import { useDriverStore } from '../store/driver-store';

/**
 * Main driver list page showing table of all known drivers
 */
const DriverListPage: React.FC = () => {
  const drivers = useDriverStore((state) => state.drivers);

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Drivers
      </Typography>
      <DriverListTable drivers={drivers} />
    </Box>
  );
};

export default DriverListPage;
