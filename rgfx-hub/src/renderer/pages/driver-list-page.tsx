import React from 'react';
import { Typography, Box } from '@mui/material';
import DriverListTable from '../components/driver-list-table';
import { useDriverStore } from '../store/driver-store';

/**
 * Main driver list page showing table of all known drivers
 */
const DriverListPage: React.FC = () => {
  const drivers = useDriverStore(state => state.drivers);

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Drivers
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        All discovered drivers are listed below. Click "More Info" to view detailed information.
      </Typography>
      <DriverListTable drivers={drivers} />
    </Box>
  );
};

export default DriverListPage;
