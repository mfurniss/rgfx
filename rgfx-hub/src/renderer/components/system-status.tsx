import React, { useState, useEffect } from 'react';
import { Paper, Typography, Grid } from '@mui/material';
import type { SystemStatus as SystemStatusType } from '../../types';
import SystemStatusItem from './system-status-item';
import { formatNumber, formatUptime } from '../utils/formatters';
import { UI_TIMESTAMP_UPDATE_INTERVAL_MS } from '~/src/config/constants';
import pkg from '../../../package.json';

interface SystemStatusProps {
  status: SystemStatusType;
}

/**
 * Displays the overall system status including MQTT broker, UDP server,
 * event reader, and connected drivers count
 */
const SystemStatus: React.FC<SystemStatusProps> = ({ status }) => {
  const [now, setNow] = useState(Date.now());

  // Update every second for live uptime
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, UI_TIMESTAMP_UPDATE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const currentUptime = now - status.hubStartTime;

  const statusItems = [
    { name: 'Version', value: pkg.version },
    { name: 'IP Address', value: status.hubIp },
    { name: 'Uptime', value: formatUptime(currentUptime) },
    { name: 'MQTT Broker', value: status.mqttBroker },
    { name: 'UDP Server', value: status.udpServer },
    { name: 'Event Reader', value: status.eventReader },
    { name: 'Drivers Connected', value: formatNumber(status.driversConnected) },
    { name: 'Events Processed', value: formatNumber(status.eventsProcessed) },
  ];

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        RGFX Hub System Status
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
