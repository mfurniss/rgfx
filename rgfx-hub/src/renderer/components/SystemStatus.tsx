import React from 'react';
import { Paper, Typography, Grid } from '@mui/material';
import type { SystemStatus as SystemStatusType } from '../../types';
import SystemStatusItem from './SystemStatusItem';

interface SystemStatusProps {
  status: SystemStatusType;
}

/**
 * Displays the overall system status including MQTT broker, UDP server,
 * event reader, and connected devices count
 */
const SystemStatus: React.FC<SystemStatusProps> = ({ status }) => {
  const statusItems = [
    { name: 'MQTT Broker', value: status.mqttBroker },
    { name: 'UDP Server', value: status.udpServer },
    { name: 'Event Reader', value: status.eventReader },
    { name: 'Devices Connected', value: status.devicesConnected },
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
