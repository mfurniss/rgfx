import React from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Paper } from '@mui/material';
import DriverCard from '../components/driver-card';
import { useDriverStore } from '../store/driver-store';

/**
 * Driver detail page showing full DriverCard for a specific driver
 */
const DriverDetailPage: React.FC = () => {
  const { mac } = useParams<{ mac: string }>();

  // Use reactive selector that subscribes to specific driver changes
  const driver = useDriverStore((state) => state.drivers.find((d) => d.mac === mac));

  if (!mac) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">Invalid driver MAC address</Typography>
      </Paper>
    );
  }

  if (!driver) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="error" gutterBottom>
          Driver Not Found
        </Typography>
        <Typography color="text.secondary">No driver found with MAC: {mac}</Typography>
      </Paper>
    );
  }

  return <DriverCard driver={driver} />;
};

export default DriverDetailPage;
