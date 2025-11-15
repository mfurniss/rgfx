import React from 'react';
import { Paper, Typography, Grid } from '@mui/material';
import type { SystemStatus as SystemStatusType } from '../../types';
import SystemStatusItem from './system-status-item';
import { formatNumber } from '../utils/formatters';

interface SystemStatusProps {
  status: SystemStatusType;
}

/**
 * Displays the overall system status including MQTT broker, UDP server,
 * event reader, and connected drivers count
 */
const SystemStatus: React.FC<SystemStatusProps> = ({ status }) => {
  const statusItems = [
    { name: 'MQTT Broker', value: status.mqttBroker },
    { name: 'UDP Server', value: status.udpServer },
    { name: 'Event Reader', value: status.eventReader },
    { name: 'Drivers Connected', value: formatNumber(status.driversConnected) },
    { name: 'Events Processed', value: formatNumber(status.eventsProcessed ?? 0) },
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        System Status
      </Typography>
      <Grid container spacing={2}>
        {statusItems.map((item) => (
          <SystemStatusItem key={item.name} name={item.name} value={item.value} />
        ))}
      </Grid>
    </Paper>
  );
};

export default SystemStatus;
