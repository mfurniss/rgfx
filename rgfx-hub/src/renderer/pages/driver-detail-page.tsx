import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Button, Typography, Paper } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DriverCard from '../components/driver-card';
import { useDriverStore } from '../store/driver-store';

/**
 * Driver detail page showing full DriverCard for a specific driver
 */
const DriverDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Use reactive selector that subscribes to specific driver changes
  const driver = useDriverStore((state) => state.drivers.find((d) => d.id === id));

  if (!id) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography color="error">Invalid driver ID</Typography>
      </Paper>
    );
  }

  if (!driver) {
    return (
      <Box>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => {
            void navigate('/');
          }}
          sx={{ mb: 3 }}
        >
          Back to Drivers
        </Button>
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="h6" color="error" gutterBottom>
            Driver Not Found
          </Typography>
          <Typography color="text.secondary">No driver found with ID: {id}</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => {
          void navigate('/');
        }}
        sx={{ mb: 3 }}
      >
        Back to Drivers
      </Button>
      <DriverCard driver={driver} />
    </Box>
  );
};

export default DriverDetailPage;
